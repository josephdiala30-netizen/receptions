# Gabay sa Pag-setup ng Supabase

## Step 1: Login sa Supabase Dashboard
1. Pumunta sa https://supabase.com/dashboard
2. Login gamit ang Google/GitHub account mo

## Step 2: Buksan ang Project
1. I-click ang project na ginawa mo (`xhweqrlyppvtksqbqrne`)
2. Hintaying mag-load ang dashboard

## Step 3: I-enable ang Email Auth
1. Sa kaliwang sidebar, i-click ang **Authentication** → **Providers**
2. Tiyaking naka-ON ang **Email** (dapat may green check)
3. I-click ang **Email** para i-edit
4. I-OFF ang **Confirm email** (para hindi mag-email ng confirmation)
5. I-click ang **Save**

## Step 4: Run ang SQL Schema
1. Sa kaliwang sidebar, i-click ang **SQL Editor**
2. I-click ang **New Query**
3. Buksan ang file na `supabase-schema.sql` sa project folder
4. I-copy ang buong content at i-paste sa SQL Editor
5. I-click ang **Run** (or Ctrl+Enter)
6. Hintaying mag-success (dapat walang errors)

## Step 5: I-deploy sa Vercel (para online)
1. I-commit at i-push ang changes sa GitHub
2. Sa Vercel, redeploy ang project
3. Hintaying matapos

## Step 6: Gumawa ng Super Admin Account
1. Pumunta sa Vercel URL ng app mo (or local: http://localhost/Scheduler/login/)
2. I-click ang **Register** tab
3. Ilagay:
   - **Full Name:** Super Administrator
   - **Username:** superadmin
   - **Email:** superadmin@kalyx.com
   - **Password:** password
   - **Portal:** kahit ano
4. I-click ang **Create Account**
5. Makakakita ka ng "Welcome to KALYX!" modal
6. I-click ang **Continue to Login**

## Step 7: I-promote sa Admin
1. Bumalik sa **Supabase Dashboard > SQL Editor**
2. Gumawa ng **New Query**
3. I-paste ito:
   ```sql
   UPDATE profiles SET is_admin = true, role = 'admin' WHERE username = 'superadmin';
   ```
4. I-click ang **Run**
5. Dapat may lumabas na "Success. No rows returned" (or "1 row affected")

## Step 8: Login bilang Admin
1. Sa login page, ilagay ang credentials ng superadmin
2. I-click ang **Sign In**
3. Dapat ma-redirect ka sa admin portal
4. Kung hindi, i-check ang browser console para sa errors

## Step 9: I-apply ang RLS Fix (kailangan para mag-sync ang data sa lahat ng devices)

### Para sa lahat ng users (baguhan at luma):

1. Pumunta sa **Supabase Dashboard** → https://supabase.com/dashboard
2. I-click ang project mo
3. Sa kaliwang sidebar, i-click ang **SQL Editor**
4. I-click ang **New Query**
5. Buksan ang file na `supabase-fix-rls.sql` sa project folder
6. Pindutin ang **Ctrl+A** para piliin lahat, **Ctrl+C** para kopyahin
7. Bumalik sa Supabase SQL Editor, pindutin ang **Ctrl+V** para i-paste
8. I-click ang **Run** (or pindutin ang **Ctrl+Enter**)
9. Hintaying mag-success — dapat walang error

### Para sa mga existing users na mali ang role (laging napupunta sa executive_path):

1. Pagkatapos ng RLS fix sa itaas, gumawa ng **New Query** ulit
2. Buksan ang file na `supabase-repair-roles.sql`
3. Kopyahin lahat at i-paste sa SQL Editor
4. I-click ang **Run**
5. Makikita mo ang listahan ng users at ang roles nila — dapat tama na sila

### Pagkatapos:
1. Mag-login ulit sa app (i-clear muna ang localStorage: F12 > Application > Local Storage > Clear All)
2. Dapat mag-load ang data mula sa ibang device
3. Ang mga bagong save ay mag-sa-sync sa real-time sa lahat ng devices

## Step 10: I-configure ang Disable Email Confirmation (alternative)
Kung hindi mo na-off ang "Confirm email" sa Step 3, pwedeng:
1. Sa **Supabase Dashboard > Authentication > Settings**
2. Sa **General**, i-off ang **Enable email confirmations**
3. I-click ang **Save**

## Troubleshooting

### Error: "relation 'profiles' does not exist"
→ Hindi mo pa na-run ang SQL schema. Balik sa Step 4.

### Error: "new row violates row-level security"
→ Ang user ay hindi naka-login o walang session. Kailangan munang mag-login.

### Error: "User already registered"
→ Na-create na ang account. Diretso login na lang.

### Hindi maka-login
→ I-clear ang localStorage ng browser (F12 > Application > Local Storage > Clear All)
→ I-refresh at subukan uli

### Gustong ibalik sa Firebase
→ Gamitin ang backup file: `Scheduler-backup-2026-06-05_10-00-55.zip`
→ I-extract at i-restore ang original files
