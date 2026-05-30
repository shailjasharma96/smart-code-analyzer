export interface SampleCode {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SAMPLE_CODES: SampleCode[] = [
  {
    id: 'callback-hell',
    name: 'Callback Hell & Missing Errors',
    description: 'Contains deeply nested callbacks (Pyramid of Doom) and lacks robust try/catch blocks.',
    code: `// Legacy User Data Processing Service
var fs = require('fs');

function processUserData(filePath, userId) {
  // Nested legacy callbacks leading to pyramid of doom
  fs.exists(filePath, function(exists) {
    if (exists) {
      fs.readFile(filePath, 'utf8', function(err, data) {
        if (err) {
          console.log("Error reading file");
        } else {
          var users = JSON.parse(data);
          
          // Outer callback nest 1
          getUserPreferences(userId, function(prefErr, pref) {
            // Nested callback nest 2
            db.query("SELECT * FROM profiles WHERE id = " + userId, function(dbErr, profile) {
              // Deep nested callback nest 3 - callback hell!
              formatOutput(users, pref, profile, function(finalResult) {
                console.log("Process complete!");
                return finalResult;
              });
            });
          });
        }
      });
    }
  });
}
`
  },
  {
    id: 'security-vulnerabilities',
    name: 'Security Flaws & Injection',
    description: 'Exposes dangerous eval() calls, hardcoded private keys/passwords, and SQL injection strings.',
    code: `// Administrative Authentication Portal
const mysql = require('mysql');

// CRITICAL: Hardcoded administrative secrets
const ADMIN_PASSWORD = "superSecretAdminPassword123_prod";
const JWT_SECRET_TOKEN = "AIzaSyD-rQ4fH8Xj5w8e9u0aBcDeFgHiJkLmNoP";

function authenticateUser(req, res) {
  const username = req.body.username;
  const userRole = req.body.role;

  // Vulnerability 1: SQL Injection through raw string interpolation
  const queryStr = \`SELECT * FROM accounts WHERE user = '\${username}' AND password = '\${req.body.pass}'\`;
  
  db.query(queryStr, (err, results) => {
    if (err) throw err;
    
    if (results.length > 0) {
      // Vulnerability 2: Dangerous Remote Code Execution via eval()
      const roleCheckCode = "if ('" + userRole + "' == 'admin') { grantAdminRights(); }";
      eval(roleCheckCode);
      
      res.send({ status: "Authenticated", token: JWT_SECRET_TOKEN });
    } else {
      res.status(401).send("Unauthorized");
    }
  });
}
`
  },
  {
    id: 'performance-bottlenecks',
    name: 'Performance & Event Loop Blocks',
    description: 'Features synchronous blocking I/O calls, nested loops (O(N²)), and inefficient array lookups.',
    code: `// System Inventory Audit Job
const fs = require('fs');

function runInventoryCheck() {
  console.log("Starting inventory check...");

  // Inefficient 1: Synchronous I/O blocks Node event loop completely under high request volumes
  const itemData = fs.readFileSync('./inventory.json', 'utf8');
  const items = JSON.parse(itemData);

  const priceData = fs.readFileSync('./prices.json', 'utf8');
  const prices = JSON.parse(priceData);

  const matchedInventory = [];

  // Inefficient 2: O(N²) nested loops block execution threads on large datasets
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Inefficient 3: Inefficient array search inside loop (hidden O(N^2))
    for (let j = 0; j < prices.length; j++) {
      if (prices[j].id === item.priceId) {
        // Inefficient 4: indexOf search in loop leads to O(N^3) complexity spike
        const alreadyExists = matchedInventory.indexOf(item.id) !== -1;
        if (!alreadyExists) {
          matchedInventory.push({
            id: item.id,
            name: item.name,
            price: prices[j].value
          });
        }
      }
    }
  }

  return matchedInventory;
}
`
  },
  {
    id: 'clean-code-exemplar',
    name: 'Clean Code Exemplar (95+)',
    description: 'Follows ESM standards, robust try/catch, async/await, environment defaults, and O(1) maps.',
    code: `// Optimized User Profile Analytics System
import { promises as fs } from 'fs';
import { db } from './database.js';

// Enforce modern fallback values for logical reliability
const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MAX_RETRIES = process.env.API_RETRIES ?? 3;

/**
 * Optimized profile analytics compiler.
 * Demonstrates high performance O(1) lookups and secure async operations.
 */
export async function compileUserProfiles(filePath, targetIds) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const usersList = JSON.parse(fileContent);

    // Swap nested loop search with flat O(1) Set lookup
    const searchFilter = new Set(targetIds);

    // Safe parameterization prevents SQL Injection
    const sqlQuery = 'SELECT id, rank, active FROM user_profiles WHERE id IN (?)';
    const databaseProfiles = await db.query(sqlQuery, [targetIds]);

    // Build O(1) map for database parameters
    const profileMap = new Map();
    databaseProfiles.forEach(profile => {
      profileMap.set(profile.id, profile);
    });

    const validatedProfiles = [];

    // Flat single-loop iteration
    for (const user of usersList) {
      if (searchFilter.has(user.id)) {
        const dbProfile = profileMap.get(user.id);
        
        validatedProfiles.push({
          id: user.id,
          username: user.username,
          rank: dbProfile ? dbProfile.rank : 'Standard',
          status: dbProfile && dbProfile.active ? 'Active' : 'Pending'
        });
      }
    }

    return validatedProfiles;
  } catch (error) {
    // Graceful error logging & custom trace propagation
    console.error("Critical error inside compilation service:", error);
    throw new Error(\`Compilation service failed: \${error.message}\`);
  }
}
`
  }
];
