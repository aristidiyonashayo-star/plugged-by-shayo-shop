/* =========================================================
   login-test.js - find out, definitively, why the owner login fails
   ---------------------------------------------------------
   This talks to Supabase directly and prints exactly what it says.
   It does NOT save, log or transmit your password anywhere except to
   Supabase itself.

   HOW TO RUN  (paste your own email and password):

       node login-test.js you@example.com "your password"

   Put the password in quotes if it contains spaces or symbols.

   READING THE RESULT
     "Login SUCCESSFUL"                     - the account works; the problem
                                              is in the browser (see README)
     invalid_credentials                    - wrong email or wrong password.
                                              Use "Forgot password?" to reset.
     email_not_confirmed                    - the address was never confirmed.
                                              Confirm it in the Supabase
                                              dashboard, or turn confirmation off.
     user_banned / 403                      - the account is disabled.
     500 / 503 / network error              - project paused or unreachable.
   ========================================================= */
'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rgxnqvxmtdwvfydetkzh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_saQp6oatVhm5UsS-HkOCVw_6nsrCWDo';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
    console.error('Usage:');
    console.error('  node login-test.js you@example.com "your password"');
    process.exit(1);
}

(async () => {
    console.log('Project : ' + SUPABASE_URL);
    console.log('Email   : ' + email);
    console.log('Password: (' + password.length + ' characters, not shown)');
    console.log('');
    console.log('Contacting Supabase...');
    console.log('');

    let res;
    try {
        res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email, password: password })
        });
    } catch (err) {
        console.log('COULD NOT REACH SUPABASE');
        console.log('  ' + err.message);
        console.log('');
        console.log('This usually means no internet, a blocked connection, or the');
        console.log('Supabase project is paused.');
        process.exit(1);
    }

    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (e) { body = { raw: text.slice(0, 300) }; }

    console.log('HTTP status: ' + res.status);
    console.log('Supabase said: ' + JSON.stringify(body));
    console.log('');

    if (res.ok && body.access_token) {
        console.log('=== LOGIN SUCCESSFUL ===');
        console.log('The account and password are correct.');
        console.log('So the problem is in the browser, not the credentials. Check:');
        console.log('  - you are opening the admin page from the live site');
        console.log('  - your browser is not blocking the Supabase script');
        console.log('  - try a private/incognito window');
        process.exit(0);
    }

    const code = body.error_code || body.error || body.code || '';

    if (String(code).indexOf('invalid_credentials') !== -1 ||
        String(body.msg || '').toLowerCase().indexOf('invalid login') !== -1) {
        console.log('=== WRONG EMAIL OR PASSWORD ===');
        console.log('');
        console.log('Supabase is working. It simply does not recognise this');
        console.log('email + password combination.');
        console.log('');
        console.log('Things to check:');
        console.log('  1. Is the email exactly right? No extra space at the start');
        console.log('     or end. Use the full address, not a username.');
        console.log('  2. Caps Lock. Passwords are case sensitive.');
        console.log('  3. Is this the email you invited? Supabase keeps its own');
        console.log('     user list - see below.');
        console.log('  4. If you are unsure of the password, use "Forgot password?"');
        console.log('     on the admin page, or reset it in the dashboard.');
        process.exit(2);
    }

    if (String(code).indexOf('email_not_confirmed') !== -1) {
        console.log('=== EMAIL NEVER CONFIRMED ===');
        console.log('Confirm the address in the Supabase dashboard, or turn off');
        console.log('email confirmation under Authentication > Sign In / Providers.');
        process.exit(3);
    }

    console.log('=== UNEXPECTED RESPONSE ===');
    console.log('Send this whole output back and it can be diagnosed.');
    process.exit(4);
})();
