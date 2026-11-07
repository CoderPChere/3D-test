require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Export Supabase Client for usage in routes
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
app.locals.supabase = supabase;

// Routes
app.use('/api/v1/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Welcome to CityFluxy Supabase Backend API" });
});

app.get('/api/v1/health', (req, res) => {
    res.json({ status: "ok" });
});

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Supabase-backed Node.js server running on port ${PORT}`);
    });
}

module.exports = app;
