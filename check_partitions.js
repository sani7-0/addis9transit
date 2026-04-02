"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.development' });
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
async function checkPartitions() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const isPartitionedResult = await client.query(`
      SELECT 
        pg_class.relname AS partition_name,
        pg_namespace.nspname AS schema_name,
        pg_class.relkind AS partition_type
      FROM pg_inherits
      JOIN pg_class ON pg_inherits.inhrelid = pg_class.oid
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE pg_inherits.inhparent = 'vehicle_positions'::regclass;
    `);
        console.log('Is vehicle_positions partitioned?', isPartitionedResult.rowCount > 0);
        console.log('Partitions:', JSON.stringify(isPartitionedResult.rows, null, 2));
        const partitionsResult = await client.query(`
      SELECT 
        pg_class.relname AS partition_name,
        pg_catalog.pg_get_expr(d.relpartbound, d.oid) AS partition_bound_expression
      FROM pg_partitioned_table p
      JOIN pg_class ON p.partrelid = pg_class.oid
      JOIN pg_partition_rule d ON p.partrelid = d.partrelid
      WHERE pg_class.relname = 'vehicle_positions';
    `);
        console.log('All partitions:', JSON.stringify(partitionsResult.rows, null, 2));
        await client.query('COMMIT');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('Error checking partitions:', err);
    }
    finally {
        client.release();
    }
}
checkPartitions()
    .then(() => {
    console.log('Success');
    process.exit(0);
})
    .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=check_partitions.js.map