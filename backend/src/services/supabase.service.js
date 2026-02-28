const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE] Missing credentials in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseService {
    /**
     * Upsert a battery record
     */
    async upsertBattery(data) {
        const { error } = await supabase
            .from('batteries')
            .upsert({
                battery_id: data.batteryId,
                serial_number: data.serialNumber,
                battery_chemistry: data.chemistryType,
                capacity_kwh: data.capacityKWh,
                manufacturing_date: data.manufacturingDate,
                manufacturer_id: data.manufacturerId,
                carbon_footprint_kgco2e: data.carbonFootprint?.amount,
                battery_status: data.lifecycleState || 'Active',
                is_sold: data.isSold || false
            }, { onConflict: 'battery_id' })
            .select('battery_id');

        if (error) throw error;

        // Log baseline if telemetry is present
        if (data.telemetry) {
            await this.logDiagnosticBaseline(data.batteryId, data.telemetry);
        }
    }

    async listSecondLifeBatteries() {
        const { data, error } = await supabase
            .from('batteries')
            .select('battery_id, serial_number, battery_chemistry, capacity_kwh, manufacturing_date, manufacturer_id, carbon_footprint_kgco2e, battery_status, is_sold')
            .eq('battery_status', 'SecondLife')
            .eq('is_sold', false);
        if (error) throw error;
        return data.map(b => ({
            batteryId: b.battery_id,
            serialNumber: b.serial_number,
            chemistryType: b.battery_chemistry,
            capacityKWh: b.capacity_kwh,
            manufacturingDate: b.manufacturing_date,
            manufacturer: b.manufacturer_id,
            carbonFootprint: { amount: b.carbon_footprint_kgco2e },
            lifecycleState: b.battery_status,
            isSold: b.is_sold
        }));
    }

    async markAsSold(batteryId, buyerInfo) {
        const { error } = await supabase
            .from('batteries')
            .update({ is_sold: true })
            .eq('battery_id', batteryId);
        if (error) throw error;
        console.log(`[SUPABASE] Battery ${batteryId} marked as sold`);
    }

    /**
     * Record diagnostic baseline
     */
    async logDiagnosticBaseline(batteryId, telemetry) {
        const { error } = await supabase
            .from('diagnostic_baseline')
            .insert({
                battery_id: batteryId,
                avg_voltage_v: telemetry.vAvg,
                min_voltage_v: telemetry.vMin,
                max_voltage_v: telemetry.vMax,
                avg_temp_c: telemetry.tAvg,
                min_temp_c: telemetry.tMin,
                max_temp_c: telemetry.tMax,
                mean_discharge_a: telemetry.iAvg
            });
        if (error) throw error;
    }

    /**
     * Record a telemetry snapshot
     */
    async logTelemetry(batteryId, data) {
        // 1. log snapshots
        const { error: snapError } = await supabase
            .from('telemetry_snapshots')
            .insert({
                battery_id: batteryId,
                snapshot_timestamp: data.snapshotDate,
                current_soh_percent: data.sohPercentage,
                mileage_km: data.mileage,
                avg_temperature_c: data.averageTempCelsius
            });

        if (snapError) throw snapError;

        // 2. log optimization if present
        if (data.avgDepthOfDischarge !== undefined || data.peakCurrent !== undefined) {
            const { error: optError } = await supabase
                .from('usage_optimization')
                .insert({
                    battery_id: batteryId,
                    avg_depth_of_discharge_percent: data.avgDepthOfDischarge,
                    peak_current_c_rate: data.peakCurrent
                });
            if (optError) throw optError;
        }
    }

    /**
     * Record maintenance log
     */
    async logMaintenance(batteryId, data) {
        const { error } = await supabase
            .from('maintenance_logs')
            .insert({
                battery_id: batteryId,
                service_date: data.serviceDate,
                provider_id: data.serviceProviderId,
                repair_type: data.repairType,
                post_repair_soh_percent: data.postRepairSOH,
                technician_name: data.technicianSignature,
                health_restoration_factor_percent: data.healthRestorationFactor
            });

        if (error) throw error;
    }

    /**
     * Record recycling info
     */
    async logRecycle(batteryId, data) {
        const { error } = await supabase
            .from('battery_recycle')
            .insert({
                battery_id: batteryId,
                facility_id: data.recyclingFacilityId,
                lifecycle_state: data.finalState,
                decommissioning_reason: data.reason || 'End of Life',
                materials_recovered: Array.isArray(data.recoveredMaterials) ? data.recoveredMaterials.join(', ') : data.recoveredMaterials
            });

        if (error) throw error;

        // Update battery status
        await this.updateBatteryStatus(batteryId, data.finalState || 'Recycled');
    }

    async updateBatteryStatus(batteryId, status) {
        const { error } = await supabase
            .from('batteries')
            .update({ battery_status: status })
            .eq('battery_id', batteryId);
        if (error) throw error;
    }

    /**
     * Record document
     */
    async logDocument(batteryId, doc) {
        const { error } = await supabase
            .from('battery_documents')
            .insert({
                battery_id: batteryId,
                document_type: doc.type,
                file_name: doc.name,
                file_path: doc.path,
                file_size_mb: doc.size
            });
        if (error) throw error;
    }

    /**
     * Get all batteries
     */
    async listBatteries() {
        const { data, error } = await supabase
            .from('batteries')
            .select('battery_id, serial_number, battery_chemistry, capacity_kwh, manufacturing_date, manufacturer_id, carbon_footprint_kgco2e, battery_status, is_sold');
        if (error) throw error;
        return data.map(b => ({
            batteryId: b.battery_id,
            serialNumber: b.serial_number,
            chemistryType: b.battery_chemistry,
            capacityKWh: b.capacity_kwh,
            manufacturingDate: b.manufacturing_date,
            manufacturer: b.manufacturer_id,
            carbonFootprint: { amount: b.carbon_footprint_kgco2e },
            lifecycleState: b.battery_status,
            isSold: b.is_sold
        }));
    }

    /**
     * Get battery details
     */
    async getBattery(batteryId) {
        const { data, error } = await supabase
            .from('batteries')
            .select('battery_id, serial_number, battery_chemistry, capacity_kwh, manufacturing_date, manufacturer_id, carbon_footprint_kgco2e, battery_status, is_sold, telemetry_snapshots(*), maintenance_logs(*), battery_documents(*), battery_recycle(*)')
            .eq('battery_id', batteryId)
            .single();
        if (error) throw error;
        if (!data) return null;
        return {
            batteryId: data.battery_id,
            serialNumber: data.serial_number,
            chemistryType: data.battery_chemistry,
            capacityKWh: data.capacity_kwh,
            manufacturingDate: data.manufacturing_date,
            manufacturer: data.manufacturer_id,
            carbonFootprint: { amount: data.carbon_footprint_kgco2e },
            lifecycleState: data.battery_status,
            isSold: data.is_sold,
            telemetry: data.telemetry_snapshots,
            maintenance: data.maintenance_logs,
            documents: data.battery_documents,
            recycleInfo: data.battery_recycle
        };
    }
}

module.exports = new SupabaseService();
