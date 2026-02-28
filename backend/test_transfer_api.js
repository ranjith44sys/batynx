const payload = {
    transferDate: new Date().toISOString(),
    fromOwner: "John",
    toOwner: "Doe",
    updatedSOH: 95,
    sellerSignature: "sign1",
    buyerSignature: "sign2"
};

async function test() {
    try {
        const res = await fetch("http://localhost:4000/api/passport/transfer/BAT-003", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

test();
