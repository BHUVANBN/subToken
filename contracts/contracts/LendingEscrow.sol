// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./SubscriptionToken.sol";

/**
 * @title LendingEscrow
 * @dev A secure escrow contract for lending and borrowing subscription tokens
 * @notice This contract allows users to lend their subscription tokens to others for a fee,
 * while maintaining control over their tokens through a secure escrow mechanism.
 */
contract LendingEscrow is Ownable, ReentrancyGuard, Pausable, IERC1155Receiver {
    // Reference to the SubscriptionToken contract
    SubscriptionToken public subscriptionToken;
    
    // Constants
    uint256 public constant BASIS_POINTS = 10000; // 100% in basis points
    
    // Lending listing structure
    struct Listing {
        address lender;
        uint256 tokenId;
        uint256 pricePerUnit; // in wei
        uint256 availableUnits;
        uint256 totalUnits;
        uint256 minDuration; // in seconds
        uint256 maxDuration; // in seconds
        uint256 createdAt;
        bool isActive;
    }
    
    // Lending session structure
    struct Session {
        address borrower;
        uint256 listingId;
        uint256 units;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPaid;
        bool isActive;
    }
    
    // Contract state
    uint256 public listingCounter;
    uint256 public sessionCounter;
    uint256 public platformFee; // in basis points (1% = 100)
    uint256 public minRentalDuration = 1 days; // Minimum rental duration
    uint256 public maxRentalDuration = 365 days; // Maximum rental duration
    address public platformWallet;
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Session) public sessions;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userSessions;
    mapping(address => bool) public whitelistedTokens; // For future expansion to support other ERC1155 tokens
    
    // Modifiers
    modifier onlyLender(uint256 listingId) {
        require(listings[listingId].lender == msg.sender, "Not the lender");
        _;
    }
    
    modifier onlyActiveListing(uint256 listingId) {
        require(listings[listingId].isActive, "Listing not active");
        _;
    }
    
    modifier onlyActiveSession(uint256 sessionId) {
        require(sessions[sessionId].isActive, "Session not active");
        _;
    }
    
    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed lender,
        uint256 indexed tokenId,
        uint256 pricePerUnit,
        uint256 availableUnits,
        uint256 minDuration,
        uint256 maxDuration
    );
    
    event ListingUpdated(
        uint256 indexed listingId,
        uint256 newPricePerUnit,
        uint256 newAvailableUnits,
        uint256 newMinDuration,
        uint256 newMaxDuration
    );
    
    event ListingCancelled(uint256 indexed listingId);
    
    event SessionStarted(
        uint256 indexed sessionId,
        uint256 indexed listingId,
        address indexed borrower,
        uint256 units,
        uint256 startTime,
        uint256 endTime,
        uint256 totalPayment
    );
    
    event SessionEnded(
        uint256 indexed sessionId,
        uint256 indexed listingId,
        address indexed borrower,
        uint256 unitsReturned
    );
    
    event PlatformFeeUpdated(uint256 newFee);
    event PlatformWalletUpdated(address newWallet);
    event RentalDurationLimitsUpdated(uint256 minDuration, uint256 maxDuration);
    event TokenWhitelisted(address token, bool whitelisted);
    
    /**
     * @dev Constructor
     * @param _subscriptionToken Address of the SubscriptionToken contract
     * @param _platformWallet Address to receive platform fees
     * @param _platformFee Platform fee in basis points (1% = 100)
     */
    constructor(
        address _subscriptionToken,
        address _platformWallet,
        uint256 _platformFee
    ) {
        require(_subscriptionToken != address(0), "Invalid token address");
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_platformFee < BASIS_POINTS, "Fee too high");
        
        subscriptionToken = SubscriptionToken(_subscriptionToken);
        platformWallet = _platformWallet;
        platformFee = _platformFee;
        whitelistedTokens[_subscriptionToken] = true;
    }
    
    /**
     * @dev Creates a new lending listing
     * @param tokenId ID of the subscription token to lend
     * @param pricePerUnit Price per unit per second in wei
     * @param units Number of units to list
     * @param minDuration Minimum rental duration in seconds
     * @param maxDuration Maximum rental duration in seconds
     */
    function createListing(
        uint256 tokenId,
        uint256 pricePerUnit,
        uint256 units,
        uint256 minDuration,
        uint256 maxDuration
    ) external whenNotPaused {
        require(units > 0, "Must list at least one unit");
        require(pricePerUnit > 0, "Price must be greater than 0");
        require(minDuration >= minRentalDuration, "Duration below minimum");
        require(maxDuration <= maxRentalDuration, "Duration exceeds maximum");
        require(minDuration <= maxDuration, "Invalid duration range");
        
        // Transfer tokens to this contract
        subscriptionToken.safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            units,
            ""
        );
        
        // Create new listing
        uint256 listingId = ++listingCounter;
        listings[listingId] = Listing({
            lender: msg.sender,
            tokenId: tokenId,
            pricePerUnit: pricePerUnit,
            availableUnits: units,
            totalUnits: units,
            minDuration: minDuration,
            maxDuration: maxDuration,
            createdAt: block.timestamp,
            isActive: true
        });
        
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(
            listingId,
            msg.sender,
            tokenId,
            pricePerUnit,
            units,
            minDuration,
            maxDuration
        );
    }
    
    /**
     * @dev Updates an existing listing
     * @param listingId ID of the listing to update
     * @param newPricePerUnit New price per unit per second in wei
     * @param newAvailableUnits New number of units available
     * @param newMinDuration New minimum rental duration in seconds
     * @param newMaxDuration New maximum rental duration in seconds
     */
    function updateListing(
        uint256 listingId,
        uint256 newPricePerUnit,
        uint256 newAvailableUnits,
        uint256 newMinDuration,
        uint256 newMaxDuration
    ) external onlyLender(listingId) onlyActiveListing(listingId) whenNotPaused {
        require(newPricePerUnit > 0, "Price must be greater than 0");
        require(newMinDuration >= minRentalDuration, "Duration below minimum");
        require(newMaxDuration <= maxRentalDuration, "Duration exceeds maximum");
        require(newMinDuration <= newMaxDuration, "Invalid duration range");
        
        Listing storage listing = listings[listingId];
        
        // If decreasing available units, ensure we don't go below currently rented units
        uint256 rentedUnits = listing.totalUnits - listing.availableUnits;
        require(newAvailableUnits >= rentedUnits, "Cannot have fewer units than currently rented");
        
        // If increasing available units, transfer additional tokens to this contract
        if (newAvailableUnits > listing.totalUnits) {
            uint256 additionalUnits = newAvailableUnits - listing.totalUnits;
            subscriptionToken.safeTransferFrom(
                msg.sender,
                address(this),
                listing.tokenId,
                additionalUnits,
                ""
            );
        }
        
        // Update listing
        listing.pricePerUnit = newPricePerUnit;
        listing.availableUnits = newAvailableUnits - rentedUnits;
        listing.totalUnits = newAvailableUnits;
        listing.minDuration = newMinDuration;
        listing.maxDuration = newMaxDuration;
        
        emit ListingUpdated(
            listingId,
            newPricePerUnit,
            newAvailableUnits - rentedUnits,
            newMinDuration,
            newMaxDuration
        );
    }
    
    /**
     * @dev Cancels a lending listing and returns unrented tokens to the lender
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external onlyLender(listingId) onlyActiveListing(listingId) {
        Listing storage listing = listings[listingId];
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Return unrented tokens to lender
        if (listing.availableUnits > 0) {
            subscriptionToken.safeTransferFrom(
                address(this),
                msg.sender,
                listing.tokenId,
                listing.availableUnits,
                ""
            );
        }
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev Starts a new rental session
     * @param listingId ID of the listing to rent from
     * @param units Number of units to rent
     * @param duration Duration of the rental in seconds
     */
    function startSession(
        uint256 listingId,
        uint256 units,
        uint256 duration
    ) external payable nonReentrant whenNotPaused onlyActiveListing(listingId) {
        Listing storage listing = listings[listingId];
        
        // Validate inputs
        require(units > 0, "Must rent at least one unit");
        require(units <= listing.availableUnits, "Not enough units available");
        require(duration >= listing.minDuration, "Duration below minimum");
        require(duration <= listing.maxDuration, "Duration exceeds maximum");
        
        // Calculate total cost
        uint256 totalCost = listing.pricePerUnit * units * duration;
        require(msg.value >= totalCost, "Insufficient payment");
        
        // Calculate platform fee and lender amount
        uint256 feeAmount = (totalCost * platformFee) / BASIS_POINTS;
        uint256 lenderAmount = totalCost - feeAmount;
        
        // Transfer payment to lender and platform
        payable(listing.lender).transfer(lenderAmount);
        if (feeAmount > 0) {
            payable(platformWallet).transfer(feeAmount);
        }
        
        // Refund any excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        // Create new session
        uint256 sessionId = ++sessionCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        sessions[sessionId] = Session({
            borrower: msg.sender,
            listingId: listingId,
            units: units,
            startTime: startTime,
            endTime: endTime,
            totalPaid: totalCost,
            isActive: true
        });
        
        // Update listing availability
        listing.availableUnits -= units;
        
        // Transfer tokens to borrower
        subscriptionToken.safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            units,
            ""
        );
        
        userSessions[msg.sender].push(sessionId);
        
        emit SessionStarted(
            sessionId,
            listingId,
            msg.sender,
            units,
            startTime,
            endTime,
            totalCost
        );
    }
    
    /**
     * @dev Ends a rental session and returns tokens to the lender
     * @param sessionId ID of the session to end
     */
    function endSession(uint256 sessionId) external nonReentrant onlyActiveSession(sessionId) {
        Session storage session = sessions[sessionId];
        require(block.timestamp >= session.endTime, "Session not yet ended");
        
        // Mark session as inactive
        session.isActive = false;
        
        Listing storage listing = listings[session.listingId];
        
        // Return tokens to the lender
        subscriptionToken.safeTransferFrom(
            msg.sender,
            listing.lender,
            listing.tokenId,
            session.units,
            ""
        );
        
        // Update listing availability if it's still active
        if (listing.isActive) {
            listing.availableUnits += session.units;
        }
        
        emit SessionEnded(
            sessionId,
            session.listingId,
            session.borrower,
            session.units
        );
    }
    
    /**
     * @dev Allows the contract owner to update platform fee
     * @param newFee New platform fee in basis points (1% = 100)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee < BASIS_POINTS, "Fee too high");
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }
    
    /**
     * @dev Allows the contract owner to update platform wallet
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        platformWallet = newWallet;
        emit PlatformWalletUpdated(newWallet);
    }
    
    /**
     * @dev Allows the contract owner to update rental duration limits
     * @param min New minimum rental duration in seconds
     * @param max New maximum rental duration in seconds
     */
    function updateRentalDurationLimits(uint256 min, uint256 max) external onlyOwner {
        require(min > 0, "Minimum duration must be greater than 0");
        require(max > min, "Max must be greater than min");
        minRentalDuration = min;
        maxRentalDuration = max;
        emit RentalDurationLimitsUpdated(min, max);
    }
    
    /**
     * @dev Allows the contract owner to whitelist/unwhitelist ERC1155 tokens
     * @param token Address of the token contract
     * @param whitelisted Whether to whitelist or unwhitelist the token
     */
    function setWhitelistedToken(address token, bool whitelisted) external onlyOwner {
        whitelistedTokens[token] = whitelisted;
        emit TokenWhitelisted(token, whitelisted);
    }
    
    /**
     * @dev Pauses all token transfers and session creations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses all token transfers and session creations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Returns all listing IDs for a given lender
     * @param lender Address of the lender
     * @return Array of listing IDs
     */
    function getListingsByLender(address lender) external view returns (uint256[] memory) {
        return userListings[lender];
    }
    
    /**
     * @dev Returns all session IDs for a given borrower
     * @param borrower Address of the borrower
     * @return Array of session IDs
     */
    function getSessionsByBorrower(address borrower) external view returns (uint256[] memory) {
        return userSessions[borrower];
    }
    
    /**
     * @dev Required interface for ERC1155 token receiver
     */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
    
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return 
            interfaceId == type(IERC1155Receiver).interfaceId || 
            super.supportsInterface(interfaceId);
    }
    
    // Emergency withdrawal function for any ERC20 tokens sent by mistake
    function withdrawERC20(
        IERC20 token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(token.transfer(to, amount), "Transfer failed");
    }
    
    // Emergency withdrawal function for any ERC1155 tokens sent by mistake
    function withdrawERC1155(
        IERC1155 token,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        require(address(token) != address(subscriptionToken) || 
               !whitelistedTokens[address(token)], "Cannot withdraw whitelisted tokens");
        token.safeTransferFrom(address(this), to, id, amount, data);
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
    
    // Emergency stop function to pause all critical functions
    function emergencyStop() external onlyOwner {
        _pause();
    }
    
    // Function to get contract version
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
    
    // IERC165 interface support
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return 
            interfaceId == type(IERC1155Receiver).interfaceId || 
            super.supportsInterface(interfaceId);
    }
    
    // Modifiers
    modifier onlyLender(uint256 listingId) {
        require(listings[listingId].lender == msg.sender, "Not the lender");
        _;
    }
    
    modifier onlyBorrower(uint256 sessionId) {
        require(sessions[sessionId].borrower == msg.sender, "Not the borrower");
        _;
    }
    
    modifier onlyActiveListing(uint256 listingId) {
        require(listings[listingId].isActive, "Listing is not active");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _subscriptionToken Address of the SubscriptionToken contract
     * @param _platformWallet Address to receive platform fees
     * @param _platformFee Platform fee in basis points (1% = 100)
     */
    constructor(
        address _subscriptionToken,
        address _platformWallet,
        uint256 _platformFee
    ) {
        require(_subscriptionToken != address(0), "Invalid token address");
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_platformFee < 10000, "Fee too high");
        
        subscriptionToken = SubscriptionToken(_subscriptionToken);
        platformWallet = _platformWallet;
        platformFee = _platformFee;
        _transferOwnership(msg.sender);
    }
    
    /**
     * @dev Creates a new lending listing
     * @param tokenId ID of the subscription token to lend
     * @param pricePerUnit Price per unit in wei
     * @param units Number of units to list
     */
    function createListing(
        uint256 tokenId,
        uint256 pricePerUnit,
        uint256 units
    ) external {
        require(units > 0, "Must list at least one unit");
        require(pricePerUnit > 0, "Price must be greater than 0");
        
        // Check token ownership and approval
        require(
            subscriptionToken.balanceOf(msg.sender, tokenId) >= units,
            "Insufficient token balance"
        );
        require(
            subscriptionToken.isApprovedForAll(msg.sender, address(this)),
            "Contract not approved to transfer tokens"
        );
        
        // Create new listing
        uint256 listingId = ++listingCounter;
        listings[listingId] = Listing({
            lender: msg.sender,
            tokenId: tokenId,
            pricePerUnit: pricePerUnit,
            availableUnits: units,
            isActive: true
        });
        
        userListings[msg.sender].push(listingId);
        
        emit ListingCreated(
            listingId,
            msg.sender,
            tokenId,
            pricePerUnit,
            units
        );
    }
    
    /**
     * @dev Cancels a lending listing
     * @param listingId ID of the listing to cancel
     */
    function cancelListing(uint256 listingId) external onlyLender(listingId) onlyActiveListing(listingId) {
        listings[listingId].isActive = false;
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev Starts a new borrowing session
     * @param listingId ID of the listing to borrow from
     * @param units Number of units to borrow
     * @param duration Duration in seconds
     */
    function startSession(
        uint256 listingId,
        uint256 units,
        uint256 duration
    ) external payable nonReentrant onlyActiveListing(listingId) {
        Listing storage listing = listings[listingId];
        require(units > 0, "Must borrow at least one unit");
        require(units <= listing.availableUnits, "Not enough units available");
        require(duration > 0, "Duration must be greater than 0");
        
        // Calculate total price and check payment
        uint256 totalPrice = listing.pricePerUnit * units * duration;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Transfer tokens to escrow
        subscriptionToken.safeTransferFrom(
            listing.lender,
            address(this),
            listing.tokenId,
            units,
            ""
        );
        
        // Update listing
        listing.availableUnits -= units;
        
        // Create session
        uint256 sessionId = ++sessionCounter;
        sessions[sessionId] = Session({
            borrower: msg.sender,
            listingId: listingId,
            units: units,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true
        });
        
        userSessions[msg.sender].push(sessionId);
        
        // Distribute payment
        _distributePayment(listing.lender, totalPrice);
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
        
        emit SessionStarted(
            sessionId,
            listingId,
            msg.sender,
            units,
            block.timestamp,
            block.timestamp + duration
        );
    }
    
    /**
     * @dev Ends a borrowing session
     * @param sessionId ID of the session to end
     */
    function endSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        require(session.isActive, "Session is not active");
        require(
            msg.sender == session.borrower || msg.sender == owner(),
            "Not authorized to end session"
        );
        
        // Mark session as inactive
        session.isActive = false;
        
        // Get listing and token info
        Listing storage listing = listings[session.listingId];
        
        // Calculate actual duration used
        uint256 actualDuration = block.timestamp > session.endTime 
            ? session.endTime - session.startTime 
            : block.timestamp - session.startTime;
        
        // Calculate refund (if any)
        uint256 totalPaid = listing.pricePerUnit * session.units * (session.endTime - session.startTime);
        uint256 amountOwed = listing.pricePerUnit * session.units * actualDuration;
        
        // Return tokens to lender
        subscriptionToken.safeTransferFrom(
            address(this),
            listing.lender,
            listing.tokenId,
            session.units,
            ""
        );
        
        // Process refund if needed
        if (amountOwed < totalPaid) {
            uint256 refundAmount = totalPaid - amountOwed;
            uint256 platformRefund = (refundAmount * platformFee) / 10000;
            uint256 lenderRefund = refundAmount - platformRefund;
            
            // Transfer refunds
            if (lenderRefund > 0) {
                payable(listing.lender).transfer(lenderRefund);
            }
            if (platformRefund > 0) {
                payable(platformWallet).transfer(platformRefund);
            }
        }
        
        emit SessionEnded(sessionId, block.timestamp >= session.endTime);
    }
    
    /**
     * @dev Updates the platform fee
     * @param newFee New platform fee in basis points (1% = 100)
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee < 10000, "Fee too high");
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }
    
    /**
     * @dev Updates the platform wallet address
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid address");
        platformWallet = newWallet;
        emit PlatformWalletUpdated(newWallet);
    }
    
    /**
     * @dev Internal function to distribute payment between lender and platform
     * @param lender Address of the lender
     * @param amount Total payment amount
     */
    function _distributePayment(address lender, uint256 amount) internal {
        uint256 platformAmount = (amount * platformFee) / 10000;
        uint256 lenderAmount = amount - platformAmount;
        
        // Transfer to platform wallet
        if (platformAmount > 0) {
            payable(platformWallet).transfer(platformAmount);
        }
        
        // Transfer to lender
        if (lenderAmount > 0) {
            payable(lender).transfer(lenderAmount);
        }
    }
    
    /**
     * @dev Returns the list of active listings
     * @param offset Starting index
     * @param limit Maximum number of listings to return
     * @return Listing[] Array of active listings
     */
    function getActiveListings(uint256 offset, uint256 limit) external view returns (Listing[] memory) {
        uint256 count = 0;
        uint256 max = offset + limit > listingCounter ? listingCounter : offset + limit;
        
        // Count active listings in range
        for (uint256 i = offset + 1; i <= max; i++) {
            if (listings[i].isActive) {
                count++;
            }
        }
        
        // Create and populate result array
        Listing[] memory result = new Listing[](count);
        uint256 index = 0;
        
        for (uint256 i = offset + 1; i <= max; i++) {
            if (listings[i].isActive) {
                result[index] = listings[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Returns the list of active sessions for a user
     * @param user Address of the user
     * @return Session[] Array of user's active sessions
     */
    function getUserSessions(address user) external view returns (Session[] memory) {
        uint256[] storage sessionIds = userSessions[user];
        uint256 count = 0;
        
        // Count active sessions
        for (uint256 i = 0; i < sessionIds.length; i++) {
            if (sessions[sessionIds[i]].isActive) {
                count++;
            }
        }
        
        // Create and populate result array
        Session[] memory result = new Session[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < sessionIds.length; i++) {
            if (sessions[sessionIds[i]].isActive) {
                result[index] = sessions[sessionIds[i]];
                index++;
            }
        }
        
        return result;
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}
