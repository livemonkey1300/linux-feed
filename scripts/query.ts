import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const API_BASE = 'http://localhost:5000';

interface Query {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: any;
  description?: string;
}

interface Config {
  queries: Query[];
}

async function runQueries() {
  const configPath = path.join(process.cwd(), 'queries.yaml');
  if (!fs.existsSync(configPath)) {
    console.error('queries.yaml not found');
    process.exit(1);
  }

  const fileContents = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(fileContents) as Config;

  console.log(`🚀 Found ${config.queries.length} queries to run against ${API_BASE}\n`);

  for (const query of config.queries) {
    console.log(`[${query.method}] ${query.name}`);
    if (query.description) console.log(`   ${query.description}`);
    
    try {
      const options: RequestInit = {
        method: query.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (query.method === 'POST' && query.body) {
        options.body = JSON.stringify(query.body);
      }

      const start = Date.now();
      const res = await fetch(`${API_BASE}${query.path}`, options);
      const duration = Date.now() - start;

      if (!res.ok) {
        const text = await res.text();
        console.error(`   ❌ Failed (${res.status}): ${text.substring(0, 100)}...`);
      } else {
        const data = await res.json();
        console.log(`   ✅ Success (${duration}ms)`);
        console.log(`   📄 Response: ${JSON.stringify(data).substring(0, 150)}${JSON.stringify(data).length > 150 ? '...' : ''}`);
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    console.log('---');
  }
}

runQueries().catch(console.error);
