// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BatteryPassport
 * @dev Digital Battery Passport using ERC721 for identity and AccessControl for permissions.
 * Implements "Hash-on-chain, Data-off-chain" architecture.
 */
contract BatteryPassport is ERC721, AccessControl {
    // Roles
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant SERVICE_PROVIDER_ROLE = keccak256("SERVICE_PROVIDER_ROLE");
    bytes32 public constant RECYCLER_ROLE = keccak256("RECYCLER_ROLE");

    // Counters.Counter private _tokenIdCounter;
    uint256 private _tokenIdCounter;
    struct LifecycleEvent {
        bytes32 eventType; // e.g., keccak256("MANUFACTURING"), keccak256("MAINTENANCE")
        string dataHash;   // IPFS hash or similar content hash of the JSON data
        uint256 timestamp;
        address author;
    }

    // Enums
    enum BatteryStatus { Active, SecondLife, Recycled, Disposed }

    // Mappings
    // tokenId => LifecycleEvent[]
    mapping(uint256 => LifecycleEvent[]) private _batteryEvents;
    mapping(uint256 => BatteryStatus) private _batteryStatus;
    
    // Mapping to valid event types for specific roles (optional strict enforcement, 
    // but for flexibility we'll check roles in functions)

    // Events
    event PassportMinted(uint256 indexed tokenId, address indexed manufacturer, string metadataHash);
    event LifecycleEventAdded(uint256 indexed tokenId, string eventType, string dataHash, address indexed author);
    event BatteryDecommissioned(uint256 indexed tokenId, address indexed recycler, BatteryStatus finalStatus, string finalHash);

    modifier notDisposed(uint256 tokenId) {
        require(_batteryStatus[tokenId] != BatteryStatus.Disposed, "Battery is disposed and cannot be modified");
        _;
    }

    constructor() ERC721("DigitalBatteryPassport", "DBP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANUFACTURER_ROLE, msg.sender);
        _grantRole(SERVICE_PROVIDER_ROLE, msg.sender);
        _grantRole(RECYCLER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new battery passport. Only Manufacturers can mint.
     * @param to The new owner of the battery (usually the manufacturer initially or the vehicle OEM)
     * @param initialDataHash Hash of the manufacturing data
     */
    function mint(address to, string calldata initialDataHash) external onlyRole(MANUFACTURER_ROLE) returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _mint(to, tokenId);

        // Record the initial manufacturing event
        _addEvent(tokenId, "MANUFACTURING", initialDataHash, msg.sender);
        
        emit PassportMinted(tokenId, msg.sender, initialDataHash);
        return tokenId;
    }

    /**
     * @dev Add a usage or maintenance event.
     * @param tokenId The battery ID
     * @param eventTypeString String identifier of event type (e.g. "USAGE", "MAINTENANCE")
     * @param dataHash IPFS hash/content hash of the event details
     */
    function addEvent(uint256 tokenId, string calldata eventTypeString, string calldata dataHash) external notDisposed(tokenId) {
        require(_ownerOf(tokenId) != address(0), "Battery does not exist");
        
        bytes32 eventType = keccak256(abi.encodePacked(eventTypeString));

        if (eventType == keccak256("MAINTENANCE")) {
            require(hasRole(SERVICE_PROVIDER_ROLE, msg.sender), "Caller is not a service provider");
        } else if (eventType == keccak256("USAGE")) {
             // Usage data might come from the vehicle (IoT) or owner. 
             // Ideally signed by a trusted oracle or the current owner if enabled.
             // For this design, we allow the owner or a service provider to update usage.
             require(ownerOf(tokenId) == msg.sender || hasRole(SERVICE_PROVIDER_ROLE, msg.sender), "Not authorized to log usage");
        } else {
             // Fallback for general events - check generic write access or restrict
             require(hasRole(MANUFACTURER_ROLE, msg.sender), "Only manufacturer can add generic events");
        }

        _addEvent(tokenId, eventTypeString, dataHash, msg.sender);
    }

    /**
     * @dev End-of-life processing.
     */
    function decommission(uint256 tokenId, BatteryStatus newStatus, string calldata finalDataHash) external onlyRole(RECYCLER_ROLE) notDisposed(tokenId) {
        require(_ownerOf(tokenId) != address(0), "Battery does not exist");
        require(newStatus != BatteryStatus.Active, "Cannot decommission back to Active");
        
        // Transfer to recycler FIRST before locking
        if (ownerOf(tokenId) != msg.sender) {
            _transfer(ownerOf(tokenId), msg.sender, tokenId);
        }

        _batteryStatus[tokenId] = newStatus;
        string memory eventTypeStr = "RECYCLING";
        if (newStatus == BatteryStatus.SecondLife) eventTypeStr = "SECOND_LIFE";
        else if (newStatus == BatteryStatus.Disposed) eventTypeStr = "DISPOSAL";

        _addEvent(tokenId, eventTypeStr, finalDataHash, msg.sender);
        emit BatteryDecommissioned(tokenId, msg.sender, newStatus, finalDataHash);
    }

    function getBatteryStatus(uint256 tokenId) external view returns (BatteryStatus) {
        return _batteryStatus[tokenId];
    }

    function isDecommissioned(uint256 tokenId) external view returns (bool) {
        return _batteryStatus[tokenId] != BatteryStatus.Active;
    }

    /**
     * @dev Permanently remove a battery passport from the chain.
     * Only Global Admin can perform this action.
     */
    function burn(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Battery does not exist");
        
        // Clean up custom mappings
        delete _batteryEvents[tokenId];
        delete _batteryStatus[tokenId];
        
        _burn(tokenId);
    }

    // Internal helper
    function _addEvent(uint256 tokenId, string memory eventTypeStr, string memory dataHash, address author) internal {
        bytes32 eventType = keccak256(abi.encodePacked(eventTypeStr));
        _batteryEvents[tokenId].push(LifecycleEvent({
            eventType: eventType,
            dataHash: dataHash,
            timestamp: block.timestamp,
            author: author
        }));
        emit LifecycleEventAdded(tokenId, eventTypeStr, dataHash, author);
    }

    // View functions
    function getEventCount(uint256 tokenId) external view returns (uint256) {
        return _batteryEvents[tokenId].length;
    }

    function getLifecycleEvent(uint256 tokenId, uint256 index) external view returns (bytes32 eventType, string memory dataHash, uint256 timestamp, address author) {
        LifecycleEvent memory evt = _batteryEvents[tokenId][index];
        return (evt.eventType, evt.dataHash, evt.timestamp, evt.author);
    }
    
    // Override supportsInterface required by Solidity
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Override _update to prevent transfers of decommissioned batteries.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0) && _batteryStatus[tokenId] == BatteryStatus.Disposed) {
            revert("Battery is disposed and cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }



}

