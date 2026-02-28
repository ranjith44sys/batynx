from app.storage import LocalStorage

def ingest_sample_documents():
    storage = LocalStorage()

    storage.save_document(
        "battery_1",
        "Battery capacity is 75 kWh. Manufacturer is Tesla."
    )

    storage.save_document(
        "battery_2",
        "Battery lifecycle is approximately 1500 charge cycles."
    )

    print("Documents ingested.")