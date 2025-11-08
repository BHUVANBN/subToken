import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
const { ethers } = hre;

describe("SubscriptionToken", function () {
  let subscriptionToken;
  let lendingEscrow;
  let owner, lender, borrower, otherAccount;
  let sessionId;
  
  const SERVICE_ID = "NETFLIX_PREMIUM";
  const TIME_UNIT = 86400; // 1 day in seconds
  const TOKEN_AMOUNT = 10;
  const PRICE_PER_UNIT = ethers.utils.parseEther("0.01"); // 0.01 ETH per day
  
  before(async function () {
    // Get signers from Hardhat's built-in accounts
    [owner, lender, borrower, otherAccount] = await ethers.getSigners();
    
    // Deploy contracts
    const SubscriptionToken = await ethers.getContractFactory("SubscriptionToken");
    const LendingEscrow = await ethers.getContractFactory("LendingEscrow");
    
    subscriptionToken = await SubscriptionToken.deploy(
      "Tokenized Subscription",
      "TSUB",
      "https://api.tokensub.io/tokens/"
    );
    
    lendingEscrow = await LendingEscrow.deploy(
      subscriptionToken.address,
      owner.address,
      500 // 5% platform fee
    );
    
    // Mint some tokens to the lender
    await subscriptionToken.connect(lender).createToken(
      SERVICE_ID,
      TIME_UNIT,
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      TOKEN_AMOUNT
    );
    
    // Approve the lending escrow to transfer tokens
    await subscriptionToken.connect(lender).setApprovalForAll(lendingEscrow.address, true);
  });
  
  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await subscriptionToken.name()).to.equal("Tokenized Subscription");
      expect(await subscriptionToken.symbol()).to.equal("TSUB");
    });
    
    it("Should mint tokens to the creator", async function () {
      // The first token ID is a hash, so we'll get it from the event
      const filter = subscriptionToken.filters.TokenCreated();
      const events = await subscriptionToken.queryFilter(filter);
      const tokenId = events[0].args.tokenId;
      
      // Convert BigNumber to number for comparison
      const balance = await subscriptionToken.balanceOf(lender.address, tokenId);
      expect(balance.toNumber()).to.equal(TOKEN_AMOUNT);
      
      const tokenInfo = await subscriptionToken.tokenInfo(tokenId);
      expect(tokenInfo.creator).to.equal(lender.address);
      expect(tokenInfo.serviceId).to.equal(SERVICE_ID);
      expect(tokenInfo.timeUnit.toNumber()).to.equal(TIME_UNIT);
      expect(tokenInfo.isActive).to.be.true;
    });
  });
  
  describe("Lending and Borrowing", function () {
    let tokenId;
    let listingId;
    
    before(async function () {
      // Get the token ID from the TokenCreated event
      const filter = subscriptionToken.filters.TokenCreated();
      const events = await subscriptionToken.queryFilter(filter);
      tokenId = events[0].args.tokenId;
    });
    
    it("Should allow creating a lending listing", async function () {
      const tx = await lendingEscrow.connect(lender).createListing(
        tokenId,
        PRICE_PER_UNIT,
        TOKEN_AMOUNT
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "ListingCreated");
      
      expect(event).to.not.be.undefined;
      expect(event.args.lender).to.equal(lender.address);
      expect(event.args.tokenId.toString()).to.equal(tokenId.toString());
      
      // Convert BigNumbers to strings for comparison
      expect(event.args.pricePerUnit.toString()).to.equal(PRICE_PER_UNIT.toString());
      expect(event.args.availableUnits.toString()).to.equal(TOKEN_AMOUNT.toString());
      
      listingId = event.args.listingId;
    });
    
    it("Should allow starting a borrowing session", async function () {
      const unitsToBorrow = 2;
      const duration = 7; // 7 days
      
      // Get the listing to calculate the total price
      const listing = await lendingEscrow.listings(listingId);
      const totalPrice = listing.pricePerUnit.mul(unitsToBorrow).mul(duration);
      
      // Get the borrower's balance before the transaction
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      
      const tx = await lendingEscrow.connect(borrower).startSession(
        listingId,
        unitsToBorrow,
        duration,
        { value: totalPrice }
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "SessionStarted");
      
      expect(event).to.not.be.undefined;
      expect(event.args.borrower).to.equal(borrower.address);
      expect(event.args.listingId.toString()).to.equal(listingId.toString());
      
      // Store the session ID for the next test
      sessionId = event.args.sessionId;
      
      // Check that the listing was updated
      const updatedListing = await lendingEscrow.listings(listingId);
      expect(updatedListing.availableUnits.toString()).to.equal(
        (TOKEN_AMOUNT - unitsToBorrow).toString()
      );
    });
    
    it("Should allow ending a borrowing session", async function () {
      // Get the session details
      const session = await lendingEscrow.sessions(sessionId);
      
      // Fast forward time to the end of the session
      await time.increaseTo(session.endTime.toNumber() + 1);
      
      // End the session
      const tx = await lendingEscrow.connect(borrower).endSession(sessionId);
      const receipt = await tx.wait();
      
      // Check the SessionEnded event was emitted
      const event = receipt.events?.find(e => e.event === "SessionEnded");
      expect(event).to.not.be.undefined;
      expect(event.args.sessionId.toString()).to.equal(sessionId.toString());
      expect(event.args.completed).to.be.true;
      
      // Check that the session is marked as completed
      const updatedSession = await lendingEscrow.sessions(sessionId);
      expect(updatedSession.isActive).to.be.false;
    });
  });
  
  describe("Edge Cases", function () {
    it("Should not allow creating a listing with insufficient balance", async function () {
      const tokenId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("INSUFFICIENT_BALANCE"));
      
      // Try to create a listing with more tokens than the lender has
      try {
        await lendingEscrow.connect(lender).createListing(
          tokenId,
          PRICE_PER_UNIT,
          TOKEN_AMOUNT + 1 // More than the lender has
        );
        // If we get here, the test should fail
        assert.fail("Expected an error but didn't get one");
      } catch (error) {
        // Check that the error message contains the expected string
        expect(error.message).to.include("Insufficient token balance");
      }
    });
    
    it("Should not allow starting a session with insufficient payment", async function () {
      // Create a new token ID for this test to avoid conflicts
      const testServiceId = "SERVICE_WITH_PAYMENT_ISSUE_" + Date.now();
      const testAmount = 5;
      
      // Create a new token and mint it to the lender
      const createTx = await subscriptionToken.connect(lender).createToken(
        testServiceId,
        TIME_UNIT,
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        testAmount
      );
      
      // Wait for the transaction to be mined and get the receipt
      const receipt = await createTx.wait();
      
      // Get the TokenCreated event to get the actual token ID
      const tokenCreatedEvent = receipt.events?.find(
        (event) => event.event === "TokenCreated"
      );
      
      // If no TokenCreated event was found, the test should fail
      if (!tokenCreatedEvent) {
        throw new Error("TokenCreated event not found");
      }
      
      const actualTokenId = tokenCreatedEvent.args.tokenId;
      
      // Verify the tokens were minted to the lender
      const balance = await subscriptionToken.balanceOf(lender.address, actualTokenId);
      expect(balance.toNumber()).to.equal(testAmount);
      
      // Approve the lending escrow to transfer the tokens
      await subscriptionToken.connect(lender).setApprovalForAll(lendingEscrow.address, true);
      
      // Create a new listing with the actual token ID
      const listingTx = await lendingEscrow.connect(lender).createListing(
        actualTokenId,
        PRICE_PER_UNIT,
        testAmount
      );
      
      const listingReceipt = await listingTx.wait();
      const listingCreatedEvent = listingReceipt.events?.find(
        (event) => event.event === "ListingCreated"
      );
      
      // If no ListingCreated event was found, the test should fail
      if (!listingCreatedEvent) {
        throw new Error("ListingCreated event not found");
      }
      
      const listingId = listingCreatedEvent.args.listingId;
      
      // Verify the listing was created
      const listing = await lendingEscrow.listings(listingId);
      expect(listing.isActive).to.be.true;
      
      // Try to start a session with insufficient payment
      const unitsToBorrow = 1;
      const duration = 7;
      const requiredAmount = listing.pricePerUnit.mul(unitsToBorrow).mul(duration);
      const insufficientPrice = requiredAmount.sub(ethers.BigNumber.from(1)); // Less than required
      
      // Check that the borrower has enough ETH for the test
      const borrowerBalance = await ethers.provider.getBalance(borrower.address);
      expect(borrowerBalance.gt(requiredAmount)).to.be.true;
      
      // Try to start a session with insufficient payment
      try {
        await lendingEscrow.connect(borrower).startSession(
          listingId,
          unitsToBorrow,
          duration,
          { value: insufficientPrice }
        );
        // If we get here, the test should fail
        assert.fail("Expected an error but didn't get one");
      } catch (error) {
        // Check that the error message contains the expected string
        expect(error.message).to.include("Insufficient payment");
      }
    });
  });
});
