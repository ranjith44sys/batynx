const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv();
addFormats(ajv);

const SCHEMAS_DIR = path.join(__dirname, "../../schemas");

const loadSchema = (schemaName) => {
    const schemaPath = path.join(SCHEMAS_DIR, schemaName);
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    return JSON.parse(schemaContent);
};

const validateData = (schemaName, data) => {
    const schema = loadSchema(schemaName);
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (!valid) {
        return {
            isValid: false,
            errors: validate.errors
        };
    }
    
    return {
        isValid: true
    };
};

module.exports = {
    validateData
};
