# PostHog Analytics Setup Guide

## Overview
Your site now has **PostHog** analytics integrated - a comprehensive, free analytics platform that tracks user behavior, interactions, and provides session recordings.

## What's Tracking

### Automatic Tracking (Out of the Box)
- **Page views** - Every page visit
- **Clicks** - All button and link clicks
- **Form interactions** - Field focus, submissions
- **Page leave** - When users navigate away
- **User sessions** - Full session recordings (privacy-safe)

### Custom Tracking Implemented
1. **Gallery Interactions**
   - Image clicks with position tracking
   - Category identification

2. **Lightbox Tracking**
   - Open/close events
   - Image view duration
   - Navigation (next/previous)

3. **Navigation Tracking**
   - Menu clicks
   - Source and destination pages

4. **Scroll Depth**
   - Tracks at 25%, 50%, 75%, 90%, 100%

5. **Time on Page**
   - Total time
   - Active time (excludes when tab is hidden)
   - Heartbeat tracking for long sessions

6. **Portfolio Tracking**
   - Category opens (Fashion, Beauty, etc.)

7. **Contact Form**
   - Field focus events
   - Form submissions

## Setup Steps

### 1. Create PostHog Account (5 minutes)
1. Go to https://posthog.com
2. Click "Get Started - Free"
3. Sign up (email or GitHub)
4. Create a new project: "Lenko Studio"

### 2. Get Your API Key
1. After signup, you'll see your Project Settings
2. Copy your **Project API Key** (starts with `phc_...`)
3. Keep this key safe!

### 3. Add API Key to Your Site
1. Open `js/analytics.js`
2. Find line 33: `const POSTHOG_API_KEY = 'YOUR_PROJECT_API_KEY';`
3. Replace `YOUR_PROJECT_API_KEY` with your actual key:
   ```javascript
   const POSTHOG_API_KEY = 'phc_xxxxxxxxxxxxxxxxxxxxx';
   ```
4. Save the file

### 4. Deploy to Cloudflare Pages
1. Commit the changes:
   ```bash
   git add js/analytics.js *.html
   git commit -m "Add PostHog analytics"
   git push
   ```
2. Cloudflare Pages will automatically deploy

### 5. Verify It's Working
1. Visit your live site
2. Open browser console (F12)
3. Look for: `PostHog: Analytics initialized`
4. Go to PostHog dashboard → Live Events
5. You should see events coming in!

## What You Get in PostHog Dashboard

### 1. **Insights** Tab
- Page views over time
- Most visited pages
- User funnel analysis
- Conversion tracking

### 2. **Session Recordings** Tab
- Watch actual user sessions
- See mouse movements, clicks, scrolls
- Identify pain points
- **15,000 recordings/month free**

### 3. **Events** Tab
- All custom events:
  - `gallery_image_clicked`
  - `lightbox_opened`
  - `lightbox_closed`
  - `navigation_clicked`
  - `scroll_depth`
  - `page_time`
  - `portfolio_category_opened`
  - `contact_form_submitted`

### 4. **Persons** Tab
- Individual user profiles
- User journey paths
- Returning vs new visitors

## Free Tier Limits
- **1 million events/month** - plenty for most sites
- **15,000 session recordings/month**
- **1 year data retention**
- **Unlimited team members**

## Privacy & GDPR Compliance

### Built-in Privacy Features
✅ Respects "Do Not Track" browser setting  
✅ All form inputs are masked in recordings  
✅ No personal data collected by default  
✅ User IP addresses are anonymized  

### Optional: Add Cookie Consent
If you want extra privacy compliance, add this before the analytics script:

```html
<!-- Add to each HTML file before analytics.js -->
<script>
  // Check for user consent before loading analytics
  if (localStorage.getItem('analytics-consent') !== 'true') {
    // Show consent banner (you'd create this)
    // Only load analytics after user accepts
  }
</script>
```

## Advanced Configuration

### Disable Session Recordings
If you don't want session recordings, edit `js/analytics.js` line 60:
```javascript
session_recording: {
    recordCanvas: false,
    recordCrossOriginIframes: false,
    maskAllInputs: true,
    maskTextSelector: '*',
    disable: true  // Add this line
},
```

### Add More Custom Events
Example - track how long users view specific images:

```javascript
// Add to analytics.js
function trackImageViewTime() {
    const images = document.querySelectorAll('.portfolio-item__image');
    
    images.forEach(img => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    posthog.capture('image_viewed', {
                        image: img.src,
                        category: img.alt
                    });
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(img);
    });
}
```

## Analyzing Your Data

### Key Metrics to Watch
1. **Most viewed pages** - Which content is popular?
2. **Average session duration** - Are users engaged?
3. **Scroll depth** - Are users seeing your full content?
4. **Gallery interactions** - Which images get most clicks?
5. **Portfolio category popularity** - Which styles are preferred?
6. **Drop-off points** - Where do users leave?

### Creating Funnels
Example: Track user journey to contact form
1. Page view → Portfolio → Contact → Form submit
2. See where users drop off
3. Optimize those pages

### Session Recordings Use Cases
- Watch how users navigate your gallery
- See if lightbox controls are intuitive
- Identify confusing UI elements
- Find mobile usability issues

## Cost: $0
Everything described here is **100% free** under PostHog's generous free tier.

## Alternative: Self-Hosted PostHog
For unlimited events, you can self-host PostHog:
- Deploy on your own server
- Completely free
- Full data ownership
- More complex setup

## Support
- PostHog Docs: https://posthog.com/docs
- Community Slack: https://posthog.com/slack
- GitHub: https://github.com/posthog/posthog

## Next Steps
1. ✅ Setup complete - just add your API key!
2. Monitor for 1 week to gather baseline data
3. Review session recordings to identify UX issues
4. Create custom insights/dashboards
5. Set up alerts for important events (optional)

---

**Questions or issues?** Check browser console for PostHog logs.
