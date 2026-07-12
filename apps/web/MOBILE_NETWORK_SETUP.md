# Mobile Testing Setup - Network Access Guide

## 🌐 Accessing Dev Server from Mobile Device

### **Step 1: Find Your Machine's IP Address**

#### **Windows:**
```powershell
# PowerShell
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

#### **macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or specifically for WiFi:
ipconfig getifaddr en0

# Example: 192.168.1.100
```

#### **Linux:**
```bash
hostname -I

# Example: 192.168.1.100 192.168.1.101
# Use the one that matches your WiFi network
```

---

## 📱 **Ensure Mobile is on Same Network**

1. **On your mobile device:**
   - Go to Settings → WiFi
   - Connect to the SAME network as your dev machine
   - Note the WiFi name (SSID)

2. **Verify connectivity:**
   - Mobile should have WiFi symbol
   - Desktop should be on same WiFi

---

## 🚀 **Start Dev Server**

```bash
# On your dev machine
cd c:\Projects\FullStack-App\apps\web

# Start server on port 3000
npm run dev -- --port 3000

# You should see:
# ▲ Next.js 16.1.6
# - Local:        http://localhost:3000
# - Environments: .env.local
```

---

## 📲 **Access from Mobile Browser**

### **On Your Mobile Device:**

1. **Open Chrome/Firefox**

2. **In address bar, type:**
   ```
   http://192.168.1.100:3000
   (replace 192.168.1.100 with your actual IP)
   ```

3. **Press Enter**

4. **You should see:**
   - Your Sai Seva Portal app loads
   - Same as on desktop
   - Notification prompt appears

---

## ✅ **Verify Connection**

**If page loads:**
- ✅ Network access working
- ✅ Ready to test notifications

**If page doesn't load:**

### **Troubleshooting:**

1. **Check if IP is correct:**
   ```bash
   # From mobile, try pinging your machine's IP
   # Most phones can't ping, but this verifies connection
   ```

2. **Verify firewall isn't blocking:**
   ```powershell
   # Windows Firewall - allow Node.js
   # or temporarily disable firewall for testing
   ```

3. **Check dev server is actually running:**
   - Look at terminal/console
   - Should show "Local: http://localhost:3000"
   - No error messages

4. **Try on different browser:**
   - Chrome first (best support)
   - Then Firefox

5. **Restart router:**
   - Sometimes WiFi connection issues
   - Toggle WiFi off/on

---

## 🔍 **Debug Network Issues**

### **From Windows Command Prompt:**

```powershell
# Check if port 3000 is listening
netstat -ano | findstr :3000

# Should show process (Node.js) listening on port 3000
# Example: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

### **From Mobile:**

1. **Open Chrome DevTools:**
   - On desktop computer
   - Chrome → More Tools → Remote Devices
   - Connect via USB with debugging enabled
   - Or use `chrome://inspect`

2. **Enable USB Debugging on Android:**
   - Settings → About Phone
   - Tap Build Number 7 times
   - Settings → Developer Options
   - Enable USB Debugging
   - Connect via USB cable
   - Click "Allow" when prompted

3. **Inspect Mobile Browser:**
   - Desktop Chrome → `chrome://inspect`
   - Should list your mobile device
   - Click "inspect" next to the tab
   - See console logs from mobile

---

## 🧪 **Test from Mobile**

### **After App Loads:**

1. **Check Console for Logs:**
   - DevTools on mobile
   - Look for:
     - `[Firebase] Client initialized successfully`
     - `[App] Service Worker registered`
     - These confirm app is working

2. **Test Notifications:**
   - Notification prompt appears after 2 seconds
   - Click "Enable"
   - Grant permission
   - Console should show: `[FCM] Token obtained`

3. **Send Test Notification:**
   - Open another browser window on desktop
   - Go to `http://localhost:3000/api/test/send-notification` (POST request)
   - Or use curl from terminal

---

## 💡 **Network Setup Tips**

### **For Stable Connection:**
1. Connect mobile and desktop via same WiFi
2. Avoid switching networks during testing
3. Keep mobile plugged in (if testing long sessions)
4. Disable power saving during tests

### **If Using USB Debugging:**
1. Mobile stays connected to computer
2. Can work without WiFi (but still need internet for Firebase)
3. Better stability than WiFi
4. Terminal logs better visible

### **Multiple Devices:**
```
If testing on multiple phones:
1. Device A → Token A registered in DB
2. Device B → Token B registered in DB
3. Send notification → Both devices receive it
4. Perfect for testing multi-device support!
```

---

## 🌐 **Chrome Inspect Tools (Recommended)**

### **Setup Remote Debugging:**

**On Desktop:**

1. **Enable USB Debugging on Mobile:**
   - Settings → Developer Options → USB Debugging

2. **Connect via USB Cable**

3. **On Desktop Chrome:**
   - Type `chrome://inspect` in address bar
   - Check "Discover USB devices"
   - Your device should appear
   - Click "Inspect" below the tab

4. **DevTools Opens:**
   - See mobile screen live
   - See console logs in real-time
   - Can debug notifications as they happen

**Benefits:**
- Real-time console logs
- See exactly what's happening
- Can test notifications while debugging
- Perfect for troubleshooting

---

## 📝 **Testing Checklist**

- [ ] Dev server running (`npm run dev`)
- [ ] Mobile on same WiFi as desktop
- [ ] Know your machine's IP address
- [ ] Can access `http://YOUR-IP:3000` from mobile
- [ ] App loads and looks correct
- [ ] Console shows initialization logs
- [ ] Notification prompt appears
- [ ] Can enable notifications
- [ ] FCM token obtained
- [ ] Test notification can be sent
- [ ] Notification appears on mobile

---

## 🔗 **Quick Reference**

### **Windows - Get IP:**
```
ipconfig → Look for IPv4 Address (usually 192.168.x.x)
```

### **Start Dev Server:**
```
npm run dev -- --port 3000
```

### **Access from Mobile:**
```
http://[YOUR-IP]:3000
```

### **Enable Remote Debugging:**
```
chrome://inspect on desktop + USB debugging on mobile
```

### **Send Test Notification:**
```
curl -X POST http://localhost:3000/api/test/send-notification \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello Mobile","body":"Testing from desktop"}'
```

---

## ⚡ **Quick Start Example**

```
# Terminal 1: Start dev server
cd c:\Projects\FullStack-App\apps\web
npm run dev -- --port 3000

# Get your IP (Windows):
ipconfig
# Note: 192.168.1.50

# On mobile:
# Open Chrome
# Type: http://192.168.1.50:3000
# Enable notifications
# Done!
```

---

## 🎯 **Next: Actually Test**

Once you can access the app from mobile:

1. **Follow NOTIFICATIONS_CROSS_PLATFORM_TESTING.md**
2. **Work through each scenario**
3. **Document what works/what doesn't**
4. **Fix any issues**

---

**Ready to test cross-platform! 🚀**
