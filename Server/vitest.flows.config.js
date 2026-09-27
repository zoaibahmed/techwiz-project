import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/flows/**/*.test.js'],environment:'node'}});
