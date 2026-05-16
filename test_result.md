#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build the "Dimensionlock Astrolabe Terminal" — a 3D web-based exploration of the 199-Layer
  Creation universe (Reapers, factions, realities), hosted in an Expo WebView. Latest scope adds
  (Phase A) an animated 3D holographic projector boot, and (Phase D) community lore contributions
  + community-saved universes backed by MongoDB.

backend:
  - task: "Phase D — Community Lore endpoints (CRUD, vote, flag)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            New collection `lore_contributions`. Endpoints:
              POST   /api/lore/contribute
              GET    /api/lore/recent
              GET    /api/lore/{target_type}/{target_id}?sort=trending|recent|top&include_hidden=
              POST   /api/lore/{id}/vote      (idempotent toggle)
              POST   /api/lore/{id}/flag      (auto-hides at flag_count>=3)
              PATCH  /api/lore/{id}           (author wid match only)
              DELETE /api/lore/{id}?author_wid=
            Validation: target_type ∈ {reality, poi, sub_location, faction, reaper}; content 10-1000 chars; wid ^[A-Z0-9]{4,8}$.
            Verified manually with curl: create + list + vote all returned 200 OK.
        - working: true
          agent: "testing"
          comment: |
            Full automated suite in /app/backend_test.py executed against the external
            preview URL (EXPO_PUBLIC_BACKEND_URL). All Lore checks PASSED:
              * Happy-path CRUD: create → recent → list-by-target → patch → delete (incl. author-only 403s)
              * Vote toggle: first call +1, second call from same WID toggles back to 0, voters list updated
              * Flag threshold: 3 distinct WIDs flip hidden=true; default GET excludes; ?include_hidden=true includes
              * Validation: bad target_type → 400, content <10 / >1000 chars → 422, WID violating ^[A-Z0-9]{4,8}$ → 400
              * 404s on vote/flag of unknown contribution_id
              * sort=top / recent / trending all produce expected ordering; limit param respected; sort=banana → 422
              * Edge case: no title + no author_name → defaults applied (title=None, author_name="Anonymous Wanderer")
            No bugs found. Implementation matches spec exactly.

  - task: "Phase D — Community Saves endpoints (CRUD, vote, flag, load)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            New collection `universe_saves`. Endpoints:
              POST   /api/saves                       (create)
              GET    /api/saves?sort=...&limit=...&author_wid=  (list)
              GET    /api/saves/{id}                  (load specific)
              POST   /api/saves/{id}/vote
              POST   /api/saves/{id}/flag
              DELETE /api/saves/{id}?author_wid=
            Save payload: name, description, seed (int), event_history (capped 200), settings (optional dict).
            Verified manually with curl: create + list returned 200 OK.
        - working: true
          agent: "testing"
          comment: |
            Full automated suite in /app/backend_test.py — all Saves checks PASSED:
              * Happy-path: create → list (recent) → get → vote toggle → author-only delete → 404 after delete
              * Vote toggle on save works the same as lore (idempotent)
              * Flag threshold: 3 distinct WIDs → hidden=true, hidden saves excluded from default list, but
                still returned when filtering ?author_wid=<owner> (author can still see/load their own)
              * Validation: missing name → 422, whitespace-only name → 422, bad WID → 400, bad sort → 422
              * 404 on vote/flag/get of unknown save_id
              * Edge cases: empty event_history + no description accepted; event_history > 200 entries capped at 200
            No bugs found. Implementation matches spec.

  - task: "Astrolabe HTML + Service Worker delivery"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "GET /api/astrolabe and /api/service-worker.js still serve correctly; PWA + offline cache working."

  - task: "UI bug fixes + Music & video integration"
    implemented: true
    working: true
    file: "backend/static/main_menu.html, backend/static/breach_defense.html, backend/static/astrolabe.html"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            BUG FIXES:
            • Achievement toast was getting stuck on screen with "--" placeholder
              and no way to dismiss. Fixed by: (1) adding a × close button, (2) the
              whole toast is now tap-to-dismiss, (3) safer guard against empty
              name strings (trimmed), (4) storing setTimeout id so successive
              achievements properly reset the dismiss timer, (5) a visibilitychange
              failsafe that re-arms the dismiss if the toast lingers after the page
              regains focus. Toast also resets innerText so the literal "--" can
              never bleed through.
            • Main menu mobile overflow — three+ buttons were below the fold on
              tall mobiles/tablets. Added: tight mobile media queries (lore block
              max-height 26vh with feathered mask, compact splash, condensed
              button padding), proper safe-area-inset-bottom respect, single-column
              menu grid, html/body overflow-y:auto fallback.
            MUSIC + VIDEO:
            • User-supplied Theenderswar (instrumental) wired as the main menu /
              ambient theme at /api/static/dimensionlock_theme.mp3 (5.7 MB, 192k
              MP3 transcoded from the 62 MB WAV via ffmpeg). The menu's existing
              audio system auto-detects and plays it on first user gesture.
            • DL_Opening_Theme wired as the Reality Breach Defense soundtrack at
              /api/static/dl_opening_theme.mp3 (2.4 MB) — auto-plays on first
              click/tap with ♪ mute toggle.
            • Two cinematic videos (fun_1.mp4 / aa_2.mp4) are now accessible from
              a new fourth main-menu card "LORE ARCHIVES" that opens a modal
              video player with FRAGMENT 01 / FRAGMENT 02 tabs, native HTML5
              controls, ESC-to-close, click-outside-to-close. Pauses the menu
              music during playback and resumes on close.
            • Service worker bumped to v5 and pre-caches both MP3s.
            • Updated /app/dist (28 files, 19.7 MB) and /app/portable/...zip (19.7
              MB) — both include the music + videos. Portable bundle's PLAY.html
              still drag-and-drop double-clickable.

            Verified end-to-end via screenshot tool:
              • Main menu mobile (390×750) — all 4 buttons visible, no overflow
              • Main menu tablet (820×1180) — clean layout
              • LORE ARCHIVES modal — opens, video player renders, tabs visible
              • Breach Defense — music auto-plays on first click (currentTime > 0)
    implemented: true
    working: true
    file: "backend/static/main_menu.html, backend/static/breach_defense.html, backend/static/astrolabe.html, backend/scripts/build_portable.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            • Created a cinematic MAIN MENU (/api/astrolabe) with the Maytradalis /
              Death / Flybutt / Lurker lore intro, link to globalcomix.com/c/dimensionlock,
              splash art, audio toggle, and 3 menu cards: Astrolabe Terminal · Breach
              Defense · Read the Comic.
            • Procedural dimensionlock-flavored ambient dirge (low drone + minor-3rd
              pad + distant bells) auto-replaced by a real track if the user drops one
              at /api/static/dimensionlock_theme.mp3.
            • Merged the user-submitted Reality Breach Defense mini-game into the main
              astrolabe.html (accessible from in-game pause menu) AND created a
              standalone /api/breach-defense page with back-to-menu button.
            • Expanded the procedural sub-location pool from 9 to 53 entries: now
              includes 14 Lovecraftian (The Whispering Fold, Iridescent Eye-Well,
              Mouthless Cathedral, Yog-Synaptic Lattice, etc.), 12 Demonic (Bone Forge,
              Sulfur-Vent Arena, Pyre-Throne, Marrowsmoke Cloister, etc.), 12 Angelic
              (Halo-Forge, Empyrean Conduit, Cherub Garden, Seraph's Anvil, etc.), and
              8 Wonder/Mystery types. Smuggler Den now appears ~1.9% of the time
              instead of ~11%. classifyPOI() upgraded to keyword-match these names
              so the 3D holograms pick appropriate horror/spire/nebula meshes.
            • New /api/astrolabe-game endpoint keeps the chunked launcher accessible
              from the menu; /api/astrolabe-legacy still serves the monolithic HTML.
            • Service worker bumped to v4 to cache the new main_menu + breach-defense
              + astrolabe-game endpoints.
            • Updated /app/dist (5.7 MB, 24 files) for hybrid hosting on Netlify /
              Cloudflare Pages / Vercel — drag and drop deployable.
            • NEW: /app/portable/DimensionLock_Astrolabe_Portable.zip (5.6 MB) is a
              self-contained offline bundle with PLAY.html + per-OS launchers
              (PLAY-Windows.bat, PLAY-macOS.command, PLAY-Linux.sh) and README.txt.
              All absolute /api/* URLs auto-rewritten to relative paths so it works
              from file:// or any local http server. Service worker disabled in this
              bundle since file:// blocks SW.

            Verified end-to-end via screenshot tool: main menu renders beautifully
            on desktop + mobile; clicking ASTROLABE TERMINAL boots the chunked
            launcher (cached chunks → instant relaunch); clicking BREACH DEFENSE
            launches the standalone arcade with 10 floating orbs; portable bundle
            served via http.server runs identically (relative paths working, all
            assets load, chunked launcher renders with progress UI).

            NOTE: User asked to "use my dimensionlock music" but no audio file was
            attached. The menu plays a procedural dirge as fallback and auto-
            switches to a real track if `dimensionlock_theme.mp3` is placed at
            /api/static/ (or data/api/static/ in the portable bundle).

frontend:
  - task: "Astrolabe 3D scene (Three.js bloom, scanlines, holograms, music, pause menu, boot)"
    implemented: true
    working: true
    file: "backend/static/astrolabe.html"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "All visual/UX features verified via screenshot tool. Mobile landscape now also routes to mobile UI via (pointer:coarse) and (orientation: landscape) media queries."

  - task: "Phase D — Community UI (contribute lore modal + saves modal, wired into databanks + pause menu)"
    implemented: true
    working: true
    file: "backend/static/astrolabe.html"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            Wanderer ID auto-generated and persisted. Community section appended below
            every databank's auto-generated lore. Saves modal opens from pause menu.
            Verified via screenshot tool: contributions appear, saves create+list works,
            voting hits backend (200 OK), mobile full-sheet styling applied.

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Phase D — Community Lore endpoints (CRUD, vote, flag)"
    - "Phase D — Community Saves endpoints (CRUD, vote, flag, load)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Please test the Phase D backend endpoints listed under `backend.tasks`. Focus areas:
        1. CRUD happy paths for both /api/lore/* and /api/saves/*
        2. Validation errors:
           - target_type outside the allowed set
           - content shorter than 10 chars or longer than 1000
           - bad WID (must match ^[A-Z0-9]{4,8}$ uppercase)
        3. Vote idempotency — same WID voting twice should TOGGLE (un-vote)
        4. Flag threshold — once 3 distinct WIDs flag a contribution, it should set hidden=true
           and disappear from default queries (but appear with ?include_hidden=1 on lore).
        5. Author-only edit/delete — non-author should get 403.
        6. Sort params (trending/recent/top) should work and respect limit.
        7. Test edge case: empty event_history on saves, no description on saves, no title on lore.
      DB is local Mongo via existing MONGO_URL env. UUIDs as `id` field (not Mongo _id).
      You do NOT need to test the existing astrolabe HTML/PWA serving — those are stable.