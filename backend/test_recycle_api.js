const payload = {
    decommissionDate: new Date().toISOString(),
    recyclingFacilityId: "RECYCLE-001",
    finalSOH: 80,
    recoveryPercentage: 90,
    recoveredMaterials: ["Lithium", "Cobalt", "Nickel"],
    certificateOfDestruction: "CERT-001"
};

async function test() {
    try {
        const batteryId = "BAT-TEST-001";
        const res = await fetch(`http://localhost:4000/api/passport/recycle/${batteryId}`, {
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
