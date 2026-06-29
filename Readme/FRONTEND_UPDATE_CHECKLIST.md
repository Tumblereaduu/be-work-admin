# Frontend Update Checklist - React Toastify & Auth

## Pre-Implementation

- [ ] Backup current frontend code
- [ ] Ensure Node.js and npm are updated
- [ ] All existing features working before changes

---

## Installation

- [ ] Run: `npm install react-toastify`
- [ ] Verify installation: `npm list react-toastify`

---

## Step 1: App.jsx Setup

- [ ] Import `ToastContainer` from react-toastify
- [ ] Import `"react-toastify/dist/ReactToastify.css"`
- [ ] Add `<ToastContainer />` component in return JSX
- [ ] Test: npm run dev - verify no console errors

---

## Step 2: API Interceptor

- [ ] Locate your API/axios configuration file
- [ ] Add response interceptor
- [ ] Check for 401 status handling
- [ ] Check for "invalid token" message handling
- [ ] Test: Clear localStorage manually and visit protected route
- [ ] Verify: Should redirect to /login with toast "Session expired. Please login again."

---

## Step 3: Login Page Updates

- [ ] Import `toast` from react-toastify
- [ ] Import `FiEye, FiEyeOff` from react-icons/fi
- [ ] Add `showPassword` state
- [ ] Replace password input with new version (with eye icon)
- [ ] Replace `alert()` with `toast.error()` in login handler
- [ ] Replace `alert("Login successful")` with `toast.success()`
- [ ] Test: Login with valid credentials - should show success toast
- [ ] Test: Login with invalid credentials - should show error toast
- [ ] Test: Password visibility toggle works

---

## Step 4: Create ConfirmationModal Component

- [ ] Create new file: `src/components/ConfirmationModal.jsx`
- [ ] Copy ConfirmationModal code from code snippets
- [ ] Verify imports (FiAlertCircle, etc.)
- [ ] Test: Component renders without errors
- [ ] Test: Modal opens/closes correctly
- [ ] Test: Buttons work (confirm/cancel)

---

## Step 5: Chat Components - Replace Alerts

### MessageInput.jsx
- [ ] Import `toast` from react-toastify
- [ ] Replace all `alert()` calls with `toast.error()`/`toast.success()`
- [ ] Test: Sending message shows toast
- [ ] Test: Error handling shows error toast

### CreateGroupModal.jsx
- [ ] Import `toast` from react-toastify
- [ ] Replace all `alert()` with appropriate toast calls
- [ ] Test: Creating group shows success toast
- [ ] Test: Errors show error toast

### AddMembersModal.jsx
- [ ] Import `toast` from react-toastify
- [ ] Replace all `alert()` with appropriate toast calls
- [ ] Test: Adding members shows success toast
- [ ] Test: Errors show error toast

### MessageList.jsx or ChatLayout.jsx
- [ ] Look for any alert calls
- [ ] Replace with toast calls

---

## Step 6: Member Removal with Confirmation

### RightSidebar.jsx or Members Component
- [ ] Import `ConfirmationModal` component
- [ ] Import `toast` from react-toastify
- [ ] Add state for confirmation modal:
  - [ ] `confirmRemoveModal`
  - [ ] `memberToRemove`
  - [ ] `removingMember`
- [ ] Add `handleRemoveMemberClick` function
- [ ] Add `handleConfirmRemove` function
- [ ] Update remove member button to call `handleRemoveMemberClick`
- [ ] Add `<ConfirmationModal />` component
- [ ] Test: Click remove member - shows confirmation modal
- [ ] Test: Cancel removes modal without action
- [ ] Test: Confirm removes member and shows success toast
- [ ] Test: Error handling shows appropriate toast

---

## Step 7: Attendance Component Updates

### Attendance.jsx
- [ ] Import `toast` from react-toastify
- [ ] Find all `alert()` calls
- [ ] Replace with appropriate toast calls:
  - [ ] Success: `toast.success("Attendance marked successfully")`
  - [ ] Error: `toast.error(error?.response?.data?.message)`
- [ ] Test: Mark attendance shows success toast
- [ ] Test: Errors show error toast

---

## Step 8: Task Page Updates

### Tasks.jsx or Task Update Component
- [ ] Import `ConfirmationModal` component
- [ ] Import `toast` from react-toastify
- [ ] Add state for task confirmation:
  - [ ] `confirmModal`
  - [ ] `taskToUpdate`
  - [ ] `updatingTask`
- [ ] Add `handleUpdateClick` function
- [ ] Add `handleConfirmUpdate` function
- [ ] Update update button to call `handleUpdateClick`
- [ ] Add `<ConfirmationModal />` for task updates
- [ ] Do same for status change if separate
- [ ] Test: Click update - shows confirmation modal
- [ ] Test: Confirm updates task and shows success toast
- [ ] Test: Error handling shows error toast

---

## Step 9: Dashboard Updates

### Dashboard.jsx or Dashboard Widgets
- [ ] Import `toast` from react-toastify
- [ ] Find any `alert()` calls
- [ ] Replace with appropriate toast calls
- [ ] Test: All dashboard actions show appropriate toasts

---

## Step 10: Other Components

- [ ] Employees.jsx - replace alerts if any
- [ ] Any custom components with alerts - replace with toast
- [ ] Any other API call error handling - use toast

---

## Testing

### Login Tests
- [ ] Test valid login - success toast appears
- [ ] Test invalid login - error toast appears
- [ ] Test password visibility toggle - works correctly
- [ ] Test invalid token - redirects to /login with toast

### Chat Tests
- [ ] Test send message - success/error toast
- [ ] Test create group - success/error toast
- [ ] Test add members - success/error toast
- [ ] Test remove member:
  - [ ] Confirmation modal appears
  - [ ] Cancel closes modal
  - [ ] Confirm removes and shows toast
  - [ ] Error shows appropriate toast

### Attendance Tests
- [ ] Test mark attendance - success toast
- [ ] Test error - error toast appears

### Task Tests
- [ ] Test task update - confirmation modal appears
- [ ] Test task status change - confirmation modal appears
- [ ] Confirm shows success toast
- [ ] Error shows error toast

### General Tests
- [ ] All toasts close after 2.5 seconds
- [ ] Toasts stack properly (top-right)
- [ ] Theme is dark
- [ ] No console errors
- [ ] Network requests work normally
- [ ] File uploads work with toasts
- [ ] Voice messages work with toasts

---

## Verification

- [ ] Run: `npm run dev`
- [ ] Check browser console - no errors
- [ ] Test all major user flows
- [ ] Verify localStorage works correctly
- [ ] Test token expiration handling
- [ ] Build: `npm run build` - no errors

---

## Troubleshooting

### Toast not showing
- [ ] Check ToastContainer is in App.jsx
- [ ] Check toast import is correct: `import { toast } from "react-toastify"`
- [ ] Check CSS is imported
- [ ] Clear browser cache

### Modal not showing
- [ ] Check ConfirmationModal is imported correctly
- [ ] Check state is being set properly
- [ ] Verify z-index is high enough

### Token handling not working
- [ ] Check interceptor is added to axios instance
- [ ] Check localStorage keys match your app
- [ ] Verify redirect URL is correct
- [ ] Check browser console for errors

### Icons not showing
- [ ] Verify react-icons is installed: `npm list react-icons`
- [ ] Check icon import path
- [ ] Verify component is using icon

---

## Rollback Plan

If issues occur:
1. Stop dev server
2. Undo changes to specific file
3. Or restore from backup
4. Restart dev server
5. Test again

---

## Files to Update

```
src/
├── App.jsx                              ✓ Add ToastContainer
├── api/
│   └── api.js (or similar)              ✓ Add 401 interceptor
├── components/
│   ├── ConfirmationModal.jsx            ✓ Create new
│   ├── chat/
│   │   ├── RightSidebar.jsx             ✓ Add confirmation for remove
│   │   ├── MessageInput.jsx             ✓ Replace alerts with toast
│   │   ├── CreateGroupModal.jsx         ✓ Replace alerts with toast
│   │   ├── AddMembersModal.jsx          ✓ Replace alerts with toast
│   │   └── MessageList.jsx              ✓ Replace alerts if any
│   └── ...
├── pages/
│   ├── login.jsx                        ✓ Add password toggle, use toast
│   ├── Attendance.jsx                   ✓ Replace alerts with toast
│   ├── Tasks.jsx                        ✓ Add confirmation, use toast
│   ├── Dashboard.jsx                    ✓ Replace alerts with toast
│   └── ...
└── ...
```

---

## Summary

**Total Changes:**
- Add 1 new component (ConfirmationModal)
- Update ~10 existing components
- Add 1 new dependency (react-toastify)
- Estimated time: 2-3 hours

**Benefits:**
- Better user feedback
- Professional UX
- Confirmation for destructive actions
- Auto logout on token expiration
- Password visibility toggle

---

## Final Verification

Before committing:

- [ ] npm run build succeeds
- [ ] No console errors or warnings
- [ ] All toasts work correctly
- [ ] All confirmations work correctly
- [ ] Token expiration redirects to login
- [ ] Password toggle works on login
- [ ] Git status shows only intended changes
- [ ] No unnecessary files modified
- [ ] Existing functionality unchanged

---

**Status: Ready for Implementation ✅**
