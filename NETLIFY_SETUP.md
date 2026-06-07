# GVET PRO - Netlify Deployment

## Environment Variables Setup

Add these environment variables in your Netlify dashboard:

Go to: **Site settings → Environment variables**

### Required Variables:

```
VITE_SUPABASE_URL=https://kpuwhvsjtiqyezhmpmnt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdXdodnNqdGlxeWV6aG1wbW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDgyODIsImV4cCI6MjA5NjQyNDI4Mn0._JRAJ035r898kDvpxlEOV3n7cv2p4nJzX29f7I28h64
```

## Deployment Steps:

1. Push your code to GitHub
2. Connect your GitHub repo to Netlify
3. Add the environment variables above
4. Deploy!

Build command: `npm run build`
Publish directory: `dist`
