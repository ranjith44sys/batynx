const axios = require('axios');

const batteryId = 'BAT-002';
const url = `http://localhost:4000/api/passport/transfer/${batteryId}`;

const payload = {
    transferDate: new Date().toISOString(),
    fromOwner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    toOwner: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    updatedSOH: 95,
    sellerSignature: "OEM_SIGN",
    buyerSignature: "OWNER_SIGN"
};

async function testTransfer() {
    console.log(`Testing Transfer for ${batteryId}...`);
    try {
        const res = await axios.post(url, payload);
        console.log('Success:', res.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.status : error.message);
        if (error.response && error.response.data) {
            console.error('Body:', error.response.data);
        }
    }
}

testTransfer();
