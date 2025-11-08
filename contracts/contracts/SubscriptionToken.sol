// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SubscriptionToken
 * @dev ERC1155 token representing time-bound subscription access with role-based access control
 * and pausable functionality for emergency stops.
 * @notice This contract allows for the creation and management of time-based subscription tokens
 * that can be used to grant access to services or content for a specific duration.
 */
contract SubscriptionToken is ERC1155, Ownable, Pausable, ReentrancyGuard {
    using Strings for uint256;
    using Counters for Counters.Counter;
    
    // Token name and symbol
    string public name;
    string public symbol;
    
    // Base URI for token metadata
    string private _baseURI;
    
    // Token ID counter
    Counters.Counter private _tokenIdCounter;
    
    // Role constants
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Mapping from token ID to token details
    struct TokenInfo {
        address creator;
        string serviceId;
        uint256 timeUnit; // in seconds
        uint256 expiryTime; // timestamp when token expires
        bool isActive;
        uint256 maxSupply; // Maximum supply of tokens (0 for unlimited)
        uint256 currentSupply; // Current number of tokens minted
        uint256 price; // Price per token in wei
    }
    
    // Token ID to TokenInfo mapping
    mapping(uint256 => TokenInfo) public tokenInfo;
    
    // Service ID to Token ID mapping
    mapping(string => uint256) public serviceToTokenId;
    
    // Events for better off-chain tracking
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string serviceId,
        uint256 timeUnit,
        uint256 expiryTime,
        uint256 maxSupply,
        uint256 price
    );
    
    event TokenBurned(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );
    
    event TokenExtended(
        uint256 indexed tokenId,
        address indexed user,
        uint256 additionalTime
    );
    
    event TokenActivated(uint256 indexed tokenId);
    event TokenDeactivated(uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);
    event TokensMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 amount,
        uint256 expiryTime
    );
    
    /**
     * @dev Constructor that initializes the contract
     * @param _name Name of the token
     * @param _symbol Symbol of the token
     * @param baseURI_ Base URI for token metadata
     * @param initialOwner Initial owner of the contract
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory baseURI_,
        address initialOwner
    ) ERC1155(baseURI_) Ownable(initialOwner) {
        require(initialOwner != address(0), "Invalid owner address");
        name = _name;
        symbol = _symbol;
        _baseURI = baseURI_;
        _tokenIdCounter.increment(); // Start token IDs from 1
    }
    
    /**
     * @dev Creates a new subscription token type
     * @param serviceId Unique identifier for the service
     * @param timeUnit Duration of each token in seconds
     * @param maxSupply Maximum supply of tokens (0 for unlimited)
     * @param price Price per token in wei
     * @return tokenId The ID of the newly created token type
     */
    function createToken(
        string memory serviceId,
        uint256 timeUnit,
        uint256 maxSupply,
        uint256 price
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(timeUnit > 0, "Time unit must be greater than 0");
        require(serviceToTokenId[serviceId] == 0, "Service ID already exists");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        tokenInfo[tokenId] = TokenInfo({
            creator: msg.sender,
            serviceId: serviceId,
            timeUnit: timeUnit,
            expiryTime: 0, // Set to 0 initially
            isActive: true,
            maxSupply: maxSupply,
            currentSupply: 0,
            price: price
        });
        
        serviceToTokenId[serviceId] = tokenId;
        
        emit TokenCreated(
            tokenId,
            msg.sender,
            serviceId,
            timeUnit,
            0, // expiryTime
            maxSupply,
            price
        );
        
        return tokenId;
    }
    
    /**
     * @dev Mints new subscription tokens to the specified address
     * @param to Address to mint tokens to
     * @param serviceId Service ID of the token to mint
     * @param amount Number of tokens to mint
     * @param duration Duration of the subscription in time units
     */
    function mint(
        address to,
        string memory serviceId,
        uint256 amount,
        uint256 duration
    ) external payable nonReentrant whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        uint256 tokenId = serviceToTokenId[serviceId];
        require(tokenId != 0, "Invalid service ID");
        
        TokenInfo storage info = tokenInfo[tokenId];
        require(info.isActive, "Token is not active");
        require(
            info.maxSupply == 0 || (info.currentSupply + amount) <= info.maxSupply,
            "Exceeds maximum supply"
        );
        
        if (info.price > 0) {
            require(msg.value >= (info.price * amount), "Insufficient payment");
        }
        
        uint256 expiryTime = block.timestamp + (info.timeUnit * duration);
        
        // If user already has a token, extend the expiry time
        uint256 currentBalance = balanceOf(to, tokenId);
        if (currentBalance > 0) {
            uint256 currentExpiry = info.expiryTime;
            if (currentExpiry > block.timestamp) {
                expiryTime = currentExpiry + (info.timeUnit * duration);
            }
        }
        
        info.expiryTime = expiryTime;
        info.currentSupply += amount;
        
        _mint(to, tokenId, amount, "");
        
        emit TokensMinted(tokenId, to, amount, expiryTime);
        
        // Refund any excess payment
        if (info.price > 0 && msg.value > (info.price * amount)) {
            payable(msg.sender).transfer(msg.value - (info.price * amount));
        }
    }
    
    /**
     * @dev Burns tokens from the caller's address
     * @param tokenId ID of the token to burn
     * @param amount Number of tokens to burn
     */
    function burn(uint256 tokenId, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(
            balanceOf(msg.sender, tokenId) >= amount,
            "Insufficient balance"
        );
        
        _burn(msg.sender, tokenId, amount);
        
        emit TokenBurned(tokenId, msg.sender, amount);
    }
    
    /**
     * @dev Checks if a user's subscription is valid
     * @param user Address of the user to check
     * @param serviceId Service ID to check
     * @return isValid Whether the subscription is valid
     */
    function isSubscriptionValid(address user, string memory serviceId) external view returns (bool) {
        uint256 tokenId = serviceToTokenId[serviceId];
        if (tokenId == 0) return false;
        
        TokenInfo storage info = tokenInfo[tokenId];
        if (!info.isActive) return false;
        
        uint256 userBalance = balanceOf(user, tokenId);
        if (userBalance == 0) return false;
        
        return block.timestamp <= info.expiryTime;
    }
    
    /**
     * @dev Updates the base URI for token metadata
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
    
    /**
     * @dev Returns the base URI for token metadata
     */
    function baseURI() external view returns (string memory) {
        return _baseURI;
    }
    
    /**
     * @dev Returns the URI for a given token ID
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokenInfo[tokenId].creator != address(0), "Token does not exist");
        return string(abi.encodePacked(_baseURI, tokenId.toString()));
    }
    
    /**
     * @dev Activates a token type
     * @param tokenId ID of the token to activate
     */
    function activateToken(uint256 tokenId) external onlyOwner {
        require(tokenInfo[tokenId].creator != address(0), "Token does not exist");
        tokenInfo[tokenId].isActive = true;
        emit TokenActivated(tokenId);
    }
    
    /**
     * @dev Deactivates a token type
     * @param tokenId ID of the token to deactivate
     */
    function deactivateToken(uint256 tokenId) external onlyOwner {
        require(tokenInfo[tokenId].creator != address(0), "Token does not exist");
        tokenInfo[tokenId].isActive = false;
        emit TokenDeactivated(tokenId);
    }
    
    /**
     * @dev Pauses all token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses all token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraws contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
    
    /**
     * @dev Override to prevent transfers of expired tokens
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        
        // Skip minting and burning checks
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        // Check if any of the tokens being transferred are expired
        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 tokenId = ids[i];
            if (tokenInfo[tokenId].expiryTime < block.timestamp) {
                revert("Cannot transfer expired token");
            }
        }
    }
    }
    
    function createToken(
        string memory serviceId,
        uint256 timeUnit,
        uint256 expiryTime,
        uint256 amount
    ) external returns (uint256) {
        require(timeUnit > 0, "Time unit must be greater than 0");
        require(expiryTime > block.timestamp, "Expiry time must be in the future");
        
        // Generate a unique token ID
        uint256 tokenId = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    block.timestamp,
                    serviceId
                )
            )
        );
        
        // Store token info
        tokenInfo[tokenId] = TokenInfo({
            creator: msg.sender,
            serviceId: serviceId,
            timeUnit: timeUnit,
            expiryTime: expiryTime,
            isActive: true
        });
        
        // Mint tokens to the creator
        _mint(msg.sender, tokenId, amount, "");
        
        emit TokenCreated(
            tokenId,
            msg.sender,
            serviceId,
            timeUnit,
            expiryTime
        );
        
        return tokenId;
    }
    
    /**
     * @dev Burns tokens from the caller's account
     * @param tokenId ID of the token to burn
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 tokenId, uint256 amount) external {
        _burn(msg.sender, tokenId, amount);
        emit TokenBurned(tokenId, msg.sender, amount);
    }
    
    /**
     * @dev Returns the URI for a given token ID
     * @param tokenId ID of the token to query
     * @return URI for the token metadata
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokenInfo[tokenId].creator != address(0), "Token does not exist");
        return string(abi.encodePacked(_baseURI, tokenId.toString()));
    }
    
    /**
     * @dev Updates the base URI for all tokens
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
    }
    
    /**
     * @dev Checks if a token is valid (not expired and active)
     * @param tokenId ID of the token to check
     * @return bool True if the token is valid
     */
    function isValid(uint256 tokenId) public view returns (bool) {
        TokenInfo memory info = tokenInfo[tokenId];
        return info.isActive && block.timestamp <= info.expiryTime;
    }
    
    /**
     * @dev Hook that is called before any token transfer
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        
        // Check if tokens are valid before transfer
        if (from != address(0)) { // Not minting
            for (uint256 i = 0; i < ids.length; ++i) {
                require(isValid(ids[i]), "Token is not valid (expired or inactive)");
            }
        }
    }
}
