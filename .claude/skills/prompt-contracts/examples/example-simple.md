# Example: Simple Feature Contract

A real-world example of a Prompt Contract for a simple feature.

---

## Contract for: User Profile Avatar Upload

### GOAL
**What success looks like:**
- User clicks avatar placeholder on profile page
- File picker opens (images only)
- User selects image
- Image uploads with progress indicator
- Avatar updates immediately on success
- Old avatar is replaced (not duplicated)

**Success criteria:**
Success = user with no avatar clicks placeholder, selects 2MB JPEG, sees upload progress, avatar appears within 3 seconds, refresh shows same avatar

---

### CONSTRAINTS
**Stack requirements:**
- Storage: Supabase Storage bucket "avatars"
- Auth: Clerk session for user ID
- UI: Tailwind + shadcn/ui components
- Max file size: 5MB
- Allowed formats: JPG, PNG, WebP

**Hard boundaries:**
- ❌ No direct file upload without validation
- ❌ No storing files in database (only URLs)
- ❌ No client-side Supabase admin key

**Required patterns:**
- ✅ Client-side file size/type validation before upload
- ✅ Server-side validation in upload API endpoint
- ✅ Unique filename using user ID + timestamp
- ✅ Delete old avatar before uploading new one

**Additional constraints for this feature:**
- Compress images to max 1024x1024 before upload
- Show error toast if upload fails

---

### FORMAT
**File structure:**
1. `app/profile/page.tsx` - Profile page with avatar section
2. `components/profile/AvatarUpload.tsx` - Avatar upload component (client, max 100 lines)
3. `app/api/upload-avatar/route.ts` - Upload API endpoint
4. `lib/storage/avatars.ts` - Supabase storage helpers
5. `lib/storage/validation.ts` - File validation functions

**Code structure:**
- Max lines per file: 150
- API return type: `{ success: boolean, avatarUrl?: string, error?: string }`
- Documentation: JSDoc on upload function
- Error handling: Try-catch with user-friendly messages

**Styling:**
- Tailwind for layout
- shadcn/ui Avatar component
- shadcn/ui Progress component for upload indicator

---

### FAILURE CONDITIONS
**Deal-breakers (output is unacceptable if):**
- ❌ No file size validation (allows >5MB uploads)
- ❌ No file type validation (allows PDFs, executables)
- ❌ Missing error states (silent failures)
- ❌ Missing loading states (no upload progress)
- ❌ Uses admin key client-side
- ❌ Doesn't delete old avatar (accumulates files)
- ❌ No image compression (stores full-res 10MB images)

**Quality gates:**
- ❌ Console.logs in code
- ❌ Hardcoded bucket names
- ❌ No TypeScript types on upload function
- ❌ Missing error boundaries

---

## Approval

- [x] GOAL is testable in under 1 minute
- [x] CONSTRAINTS cover all critical boundaries
- [x] FORMAT matches our codebase structure
- [x] FAILURE CONDITIONS cover my main concerns

**Status:** APPROVED

**Notes:**
- Remember to add "avatars" bucket to Supabase if doesn't exist
- Set bucket to public read (authenticated write)
- Consider adding image cropping in future iteration

---

## Expected Output

After approval, Claude should produce:

1. **AvatarUpload.tsx** (~80 lines)
   - File input with accept filter
   - Client validation
   - Upload progress state
   - Error/success toasts
   - Image compression

2. **route.ts** (~60 lines)
   - Server validation
   - Clerk auth check
   - Delete old avatar
   - Upload new avatar
   - Return signed URL

3. **avatars.ts** (~40 lines)
   - `uploadAvatar(file, userId)`
   - `deleteAvatar(userId)`
   - `getAvatarUrl(userId)`

4. **validation.ts** (~30 lines)
   - `validateImageFile(file)`
   - `compressImage(file, maxSize)`

Total: ~210 lines across 4 files, all under 150 lines each.

---

## Why This Contract Works

✅ **GOAL is testable:** Open profile → click avatar → select file → see it update (30 seconds)

✅ **CONSTRAINTS prevent disasters:** Won't allow 50MB upload, won't use admin key client-side, won't fill storage with uncompressed images

✅ **FORMAT matches codebase:** Uses existing patterns (API routes, lib folder, shadcn/ui)

✅ **FAILURE CONDITIONS are specific:** Not "make it good" but exact violations to avoid

**Result:** First-try success, no reverts, shippable code.
