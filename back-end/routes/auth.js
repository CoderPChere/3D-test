const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// @route   POST /api/v1/auth/signup
// @desc    Register a new user using Supabase and save to public.users
router.post('/signup', async (req, res) => {
    // Frontend sends: name, email, password, organization
    const { name, email, password, organization, role } = req.body;
    const supabase = req.app.locals.supabase;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    organization,
                    role: role || 'user'
                }
            }
        });

        if (error) {
            return res.status(400).json({ message: error.message });
        }

        // Insert into the public.users table so data is visible in the Supabase Dashboard
        if (data.user) {
            const { error: dbError } = await supabase.from('users').insert([{
                id: data.user.id,
                name: name,
                email: email,
                organization: organization,
                role: role || 'user'
            }]);

            if (dbError) {
                 console.error("DB Insert Error:", dbError);
                 // We won't block the request if this fails, but log it
            }
        }

        // Generate our own JWT or return Supabase's (here we return our own to match previous API)
        const payload = {
            user: { id: data.user?.id, role: role || 'user' }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ 
                    access_token: token, 
                    role: role || 'user',
                    name: name,
                    message: "Signup successful via Supabase"
                });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/v1/auth/login
// @desc    Authenticate user using Supabase & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const supabase = req.app.locals.supabase;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ message: 'Invalid credentials or ' + error.message });
        }

        const payload = {
            user: { id: data.user.id, role: data.user.user_metadata?.role || 'user' }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    access_token: token, 
                    role: data.user.user_metadata?.role || 'user',
                    name: data.user.user_metadata?.name || '',
                    message: "Access granted via Supabase"
                });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
