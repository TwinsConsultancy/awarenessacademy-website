# Admin Privilege Restrictions Implementation

## Overview
Only the **default admin** can manage other admins. All admins (default and normal) can manage students and staff without restrictions.

## Changes Implemented

### 1. Backend Security (adminController.js)

#### Delete User Protection
- **Rule**: Only default admin can delete other admins
- **Protection**: Prevents privilege escalation through admin deletion
- **Error Message**: "Only default admin can delete other admins"
- **All other roles**: Can be deleted by any admin

#### Toggle User Status (Enable/Disable)
- **Rule**: Only default admin can disable other admins
- **Protection**: Prevents security bypass through admin account disabling
- **Error Message**: "Only default admin can disable other admins"
- **Special Case**: Default admin cannot disable themselves
- **All other roles**: Can be disabled by any admin

#### Set Default Admin
- **Rule**: Only current default admin can transfer their privileges
- **Protection**: Ensures controlled transfer of highest privileges
- **Error Message**: "Only current default admin can transfer their privileges"
- **Process**: On successful transfer, new admin becomes default and old admin becomes normal

### 2. Frontend UI (admin.js)

#### Button States for Non-Default Admins
When managing another admin:
- **Disable Button**: Shows lock icon with tooltip "Only default admin can disable other admins"
- **Delete Button**: Shows lock icon with tooltip "Only default admin can delete other admins"
- **Set as Default**: Shows disabled shield icon with tooltip "Only default admin can change default admin"

#### Button States for Default Admin
Special protections:
- **Disable Button**: Shows lock icon with tooltip "Default admin cannot be disabled"
- **Delete Button**: Shows lock icon with tooltip "Default admin cannot be deleted"
- **Set as Default**: Not shown (already default)

#### Student/Staff Management
- **All admins** (default and normal) have full access to:
  - Edit student/staff profiles
  - Enable/disable student/staff accounts
  - Delete student/staff accounts
  - View student/staff analytics

### 3. Authentication Updates (authController.js)

#### Login Response Enhancement
- Added `isDefaultAdmin` field to login response
- Frontend stores this in localStorage as part of user object
- Used for client-side privilege checking in UI

### 4. User Experience

#### Permission Warnings
- Functions check current user's default admin status
- Show warning popups when non-default admins attempt restricted actions
- Clear error messages explain privilege requirements

#### Visual Indicators
- Lock icons clearly indicate restricted actions
- Tooltips explain why actions are locked
- Disabled buttons have reduced opacity and 'not-allowed' cursor

## Testing Checklist

### As Default Admin:
- ✅ Can delete other admins
- ✅ Can disable other admins
- ✅ Can transfer default admin role to another admin
- ✅ Cannot delete themselves
- ✅ Cannot disable themselves
- ✅ Can manage all students and staff

### As Normal Admin:
- ✅ Sees locked buttons when viewing other admins
- ✅ Gets warning popup if attempting restricted action
- ✅ Can still edit admin profiles (non-privilege fields)
- ✅ Can fully manage students and staff
- ✅ Cannot escalate own privileges

### Security Verification:
- ✅ Backend validates privileges on all admin management endpoints
- ✅ Frontend matches backend restrictions
- ✅ API calls include user authentication
- ✅ localStorage properly stores isDefaultAdmin flag
- ✅ Default admin flag updates after transfer

## Files Modified

1. **backend/controllers/authController.js**
   - Added `isDefaultAdmin` to login response

2. **backend/controllers/adminController.js**
   - Updated `deleteUser()` with default admin check
   - Updated `toggleUserStatus()` with default admin check
   - Updated `setDefaultAdmin()` with privilege check

3. **frontend/js/admin.js**
   - Updated `loadUserManagement()` button rendering logic
   - Enhanced `setDefaultAdmin()` with privilege check
   - Updated `requestDeleteUser()` with role validation
   - Updated `requestToggleStatus()` with privilege check

## API Endpoints Protected

- `DELETE /api/admin/users/:id` - Delete user
- `PATCH /api/admin/users/:id/status` - Toggle user status
- `PATCH /api/admin/set-default-admin/:id` - Set default admin

## Future Considerations

1. **Audit Logging**: Track all admin privilege changes
2. **2FA for Default Admin**: Add extra security layer for highest privilege account
3. **Temporary Elevation**: Allow default admin to temporarily grant privileges
4. **Multi-Default Admin**: Support multiple default admins with equal privileges
5. **Role Hierarchy**: Create granular permission levels beyond default/normal admin
