
/* =====================================================
   CLUBCONNECT - VOLUNTEER MANAGEMENT SYSTEM
   ===================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {

    /* =================================================
       GLOBAL HELPERS
       ================================================= */

    const $ = id => document.getElementById(id);

    const USERS_KEY = 'clubconnect_users';
    const SESSION_KEY = 'clubconnect_session';
    const DATA_KEY = 'clubconnect_v1';

    function readStorage(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (error) {
        console.error('Storage read error:', error);
        return fallback;
      }
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Storage write error:', error);
        showToast('Unable to save data. Check browser storage.', true);
        return false;
      }
    }

    function uid() {
      return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
    }

    function escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]);
    }

    function localDate(days = 0) {
      const date = new Date();
      date.setDate(date.getDate() + days);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    function formatDate(date) {
      if (!date) return 'Not set';

      const parts = date.split('-');
      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      ).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    function formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }

    function showToast(message, isError = false) {
      const toast = $('toast');

      toast.textContent = message;
      toast.className = 'toast show' + (isError ? ' error' : '');

      clearTimeout(toastTimer);

      toastTimer = setTimeout(() => {
        toast.className = 'toast';
      }, 3000);
    }

    let toastTimer;

    /* =================================================
       LOGIN AND REGISTRATION
       ================================================= */

    function readUsers() {
      const users = readStorage(USERS_KEY, []);
      return Array.isArray(users) ? users : [];
    }

    // Demo-only password hash. Not suitable for production.
    function hashPassword(password) {
      let hash = 5381;

      for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) + hash + password.charCodeAt(i)) >>> 0;
      }

      return hash.toString(16);
    }

    function showApp(user) {
      $('authScreen').hidden = !!user;
      $('appShell').hidden = !user;

      if (user) {
        $('userName').textContent = user.name;
        renderAll();
      }
    }

    function startSession() {
      let email = null;

      try {
        email = localStorage.getItem(SESSION_KEY);
      } catch (error) {
        console.error(error);
      }

      const user = readUsers().find(
        item => item.email === email
      );

      showApp(user || null);
    }

    function switchAuthTab(tabName) {
      const isLogin = tabName === 'login';

      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle(
          'active',
          tab.dataset.tab === tabName
        );
      });

      $('loginForm').hidden = !isLogin;
      $('signupForm').hidden = isLogin;

      $('loginErr').textContent = '';
      $('signErr').textContent = '';
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchAuthTab(tab.dataset.tab);
      });
    });

    // SIGN UP

    $('signupForm').addEventListener('submit', event => {
      event.preventDefault();

      const name = $('signName').value.trim().replace(/\s+/g, ' ');
      const email = $('signEmail').value.trim().toLowerCase();
      const password = $('signPass').value;
      const confirmPassword = $('signPass2').value;

      let error = '';

      if (name.length < 2) {
        error = 'Please enter your full name.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        error = 'Enter a valid email address.';
      } else if (password.length < 6) {
        error = 'Password must be at least 6 characters.';
      } else if (password !== confirmPassword) {
        error = 'Passwords do not match.';
      } else if (readUsers().some(user => user.email === email)) {
        error = 'This email is already registered.';
      }

      $('signErr').textContent = error;

      if (error) return;

      const users = readUsers();

      users.push({
        id: uid(),
        name,
        email,
        pass: hashPassword(password)
      });

      if (!writeStorage(USERS_KEY, users)) return;

      try {
        localStorage.setItem(SESSION_KEY, email);
      } catch (storageError) {
        $('signErr').textContent = 'Could not create a session.';
        return;
      }

      $('signupForm').reset();

      startSession();
      showToast('Account created successfully!');
    });

    // LOG IN

    $('loginForm').addEventListener('submit', event => {
      event.preventDefault();

      const email = $('loginEmail').value.trim().toLowerCase();
      const password = $('loginPass').value;

      if (!email || !password) {
        $('loginErr').textContent =
          'Enter your email and password.';
        return;
      }

      const user = readUsers().find(item =>
        item.email === email &&
        item.pass === hashPassword(password)
      );

      if (!user) {
        $('loginErr').textContent =
          'Incorrect email or password.';
        return;
      }

      try {
        localStorage.setItem(SESSION_KEY, email);
      } catch (error) {
        $('loginErr').textContent =
          'Unable to save your login session.';
        return;
      }

      $('loginErr').textContent = '';
      $('loginForm').reset();

      startSession();
      showToast('Welcome back, ' + user.name + '!');
    });

    // LOG OUT

    $('logoutBtn').addEventListener('click', () => {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (error) {
        console.error(error);
      }

      showApp(null);
      switchAuthTab('login');
      showToast('You have logged out.');
    });

    /* =================================================
       MAIN APP DATA
       ================================================= */

    function createSeedData() {
      return {
        tasks: [
          {
            id: 't1',
            name: 'Event Registration Desk',
            desc: 'Welcome guests, check names, and hand out programs and ID stickers.',
            date: localDate(7),
            cap: 6,
            done: false
          },
          {
            id: 't2',
            name: 'Venue Setup and Decorations',
            desc: 'Arrange chairs, set up the stage, and put up decorations before the event.',
            date: localDate(6),
            cap: 10,
            done: false
          },
          {
            id: 't3',
            name: 'Food and Refreshments',
            desc: 'Prepare, serve, and clean up snacks and drinks for attendees.',
            date: localDate(7),
            cap: 5,
            done: false
          },
          {
            id: 't4',
            name: 'School Clean-up Drive',
            desc: 'Collect trash and tidy classrooms, hallways, and school grounds.',
            date: localDate(14),
            cap: 10,
            done: false
          },
          {
            id: 't5',
            name: 'Event Documentation',
            desc: 'Take photos and videos and write a short event summary.',
            date: localDate(7),
            cap: 3,
            done: false
          }
        ],
        volunteers: []
      };
    }

    function loadData() {
      const saved = readStorage(DATA_KEY, null);

      if (
        saved &&
        Array.isArray(saved.tasks) &&
        Array.isArray(saved.volunteers)
      ) {
        return saved;
      }

      const initial = createSeedData();
      writeStorage(DATA_KEY, initial);

      return initial;
    }

    let state = loadData();

    function saveData() {
      return writeStorage(DATA_KEY, state);
    }

    function taskById(id) {
      return state.tasks.find(task => task.id === id);
    }

    function countFor(id) {
      return state.volunteers.filter(
        volunteer => volunteer.taskId === id
      ).length;
    }

    function remaining(task) {
      return Math.max(0, task.cap - countFor(task.id));
    }

    function getStatus(task) {
      if (task.done) return 'completed';
      return remaining(task) === 0 ? 'full' : 'open';
    }

    const LABELS = {
      open: 'Needs Volunteers',
      full: 'Fully Staffed',
      completed: 'Completed'
    };

    /* =================================================
       DASHBOARD STATISTICS
       ================================================= */

    function renderStats() {
      $('statTasks').textContent = state.tasks.length;

      $('statVolunteers').textContent =
        state.volunteers.length;

      $('statSlots').textContent =
        state.tasks.reduce((total, task) => {
          return total + (
            task.done ? 0 : remaining(task)
          );
        }, 0);

      $('statDone').textContent =
        state.tasks.filter(task => task.done).length;

      $('reportTasks').textContent = state.tasks.length;

      $('reportVolunteers').textContent =
        state.volunteers.length;

      $('reportDone').textContent =
        state.tasks.filter(task => task.done).length;
    }

    /* =================================================
       TASK DISPLAY
       ================================================= */

    function renderTasks() {
      const query = $('searchInput').value.trim().toLowerCase();
      const filter = $('filterSelect').value;

      const tasks = state.tasks.filter(task => {
        const status = getStatus(task);

        const matchesSearch =
          task.name.toLowerCase().includes(query);

        const matchesFilter =
          filter === 'all' ||
          (filter === 'needs' && status === 'open') ||
          (filter === 'full' && status === 'full') ||
          (filter === 'completed' && status === 'completed');

        return matchesSearch && matchesFilter;
      });

      const container = $('taskList');

      if (!tasks.length) {
        container.innerHTML =
          '<p class="empty">' +
          (state.tasks.length
            ? 'No tasks match your search or filter.'
            : 'No tasks yet. Click Add Task to create one.') +
          '</p>';

        return;
      }

      container.innerHTML = tasks.map(task => {
        const status = getStatus(task);
        const registered = countFor(task.id);
        const capacity = Math.max(1, task.cap);

        const percentage = Math.min(
          100,
          Math.round((registered / capacity) * 100)
        );

        return `
          <article class="task">

            <span class="badge ${status}">
              ${LABELS[status]}
            </span>

            <h3>${escapeHTML(task.name)}</h3>

            <p>
              ${escapeHTML(task.desc) || '<em>No description.</em>'}
            </p>

            <div class="meta">
              <span>Date: ${formatDate(task.date)}</span>
              <span>${registered} / ${task.cap} registered</span>
            </div>

            <div class="bar">
              <i style="width:${percentage}%"></i>
            </div>

            <div class="meta">
              <span>Remaining Slots:</span>
              <strong>${remaining(task)}</strong>
            </div>

            <div class="actions">
              <button class="btn sm" data-act="edit"
                data-id="${escapeHTML(task.id)}">
                Edit
              </button>

              <button class="btn sm" data-act="toggle"
                data-id="${escapeHTML(task.id)}">
                ${task.done ? 'Reopen' : 'Mark Completed'}
              </button>

              <button class="btn sm danger" data-act="delete"
                data-id="${escapeHTML(task.id)}">
                Delete
              </button>
            </div>

          </article>
        `;
      }).join('');
    }

    /* =================================================
       DROPDOWN MENUS
       ================================================= */

    function renderSelects() {
      const registrationSelect = $('regTask');
      const previousTask = registrationSelect.value;

      const availableTasks = state.tasks.filter(task =>
        !task.done && remaining(task) > 0
      );

      registrationSelect.innerHTML =
        '<option value="">Select a task...</option>' +
        availableTasks.map(task => `
          <option value="${escapeHTML(task.id)}">
            ${escapeHTML(task.name)} (${remaining(task)} slots left)
          </option>
        `).join('');

      if (availableTasks.some(task => task.id === previousTask)) {
        registrationSelect.value = previousTask;
      }

      const volunteerFilter = $('volFilter');
      const previousFilter = volunteerFilter.value;

      volunteerFilter.innerHTML =
        '<option value="all">All Tasks</option>' +
        state.tasks.map(task => `
          <option value="${escapeHTML(task.id)}">
            ${escapeHTML(task.name)}
          </option>
        `).join('');

      volunteerFilter.value =
        state.tasks.some(task => task.id === previousFilter)
          ? previousFilter
          : 'all';
    }

    /* =================================================
       VOLUNTEER DISPLAY
       ================================================= */

    function renderVolunteers() {
      const filter = $('volFilter').value;

      const sorted = state.volunteers.slice().sort(
        (a, b) => b.ts - a.ts
      );

      // RECENT VOLUNTEERS

      $('recentList').innerHTML = sorted.length
        ? sorted.slice(0, 5).map(volunteer => {
            const task = taskById(volunteer.taskId);

            return `
              <li>
                <strong>${escapeHTML(volunteer.name)}</strong>
                <small>
                  ${escapeHTML(task ? task.name : 'Unknown task')}
                  · ${formatTimestamp(volunteer.ts)}
                </small>
              </li>
            `;
          }).join('')
        : '<li class="empty">No volunteers yet.</li>';

      // VOLUNTEER TABLE

      const rows = sorted.filter(volunteer =>
        filter === 'all' || volunteer.taskId === filter
      );

      $('volBody').innerHTML = rows.map(volunteer => {
        const task = taskById(volunteer.taskId);

        return `
          <tr>
            <td>${escapeHTML(volunteer.name)}</td>
            <td>${escapeHTML(volunteer.contact)}</td>
            <td>${escapeHTML(task ? task.name : 'Unknown task')}</td>
            <td>${formatTimestamp(volunteer.ts)}</td>
            <td>
              <button class="btn sm danger"
                data-vid="${escapeHTML(volunteer.id)}">
                Remove
              </button>
            </td>
          </tr>
        `;
      }).join('');

      $('volEmpty').hidden = rows.length > 0;

      $('volEmpty').textContent =
        state.volunteers.length
          ? 'No volunteers for this task.'
          : 'No volunteers registered yet.';
    }

    function renderAll() {
      renderStats();
      renderTasks();
      renderSelects();
      renderVolunteers();
    }

    /* =================================================
       ADD / EDIT TASK MODAL
       ================================================= */

    function setError(errorId, message, inputId) {
      $(errorId).textContent = message || '';

      if (inputId) {
        $(inputId).classList.toggle('invalid', !!message);
      }
    }

    function clearTaskErrors() {
      setError('errTaskName', '', 'taskName');
      setError('errTaskDate', '', 'taskDate');
      setError('errTaskCap', '', 'taskCap');
    }

    function openModal(task = null) {
      $('taskForm').reset();
      clearTaskErrors();

      $('modalTitle').textContent =
        task ? 'Edit Task' : 'Add Task';

      $('taskId').value = task ? task.id : '';

      if (task) {
        $('taskName').value = task.name;
        $('taskDesc').value = task.desc;
        $('taskDate').value = task.date;
        $('taskCap').value = task.cap;
      }

      $('taskModal').hidden = false;
      $('taskName').focus();
    }

    function closeModal() {
      $('taskModal').hidden = true;
      $('taskForm').reset();
      clearTaskErrors();
    }

    $('addTaskBtn').addEventListener('click', () => {
      openModal();
    });

    $('cancelModal').addEventListener('click', closeModal);
    $('cancelModalBottom').addEventListener('click', closeModal);

    $('taskModal').addEventListener('click', event => {
      if (event.target === $('taskModal')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', event => {
      if (
        event.key === 'Escape' &&
        !$('taskModal').hidden
      ) {
        closeModal();
      }
    });

    /* =================================================
       SAVE TASK
       ================================================= */

    $('taskForm').addEventListener('submit', event => {
      event.preventDefault();

      const id = $('taskId').value;
      const name = $('taskName').value.trim().replace(/\s+/g, ' ');
      const description = $('taskDesc').value.trim();
      const date = $('taskDate').value;
      const capacityText = $('taskCap').value.trim();
      const capacity = Number(capacityText);

      let valid = true;

      // TASK NAME

      if (!name) {
        setError(
          'errTaskName',
          'Task name is required.',
          'taskName'
        );
        valid = false;
      } else if (state.tasks.some(task =>
        task.id !== id &&
        task.name.toLowerCase() === name.toLowerCase()
      )) {
        setError(
          'errTaskName',
          'A task with this name already exists.',
          'taskName'
        );
        valid = false;
      } else {
        setError('errTaskName', '', 'taskName');
      }

      // DATE

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setError(
          'errTaskDate',
          'Please select a valid event date.',
          'taskDate'
        );
        valid = false;
      } else {
        setError('errTaskDate', '', 'taskDate');
      }

      // CAPACITY

      if (
        !capacityText ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 500
      ) {
        setError(
          'errTaskCap',
          'Enter a whole number from 1 to 500.',
          'taskCap'
        );
        valid = false;
      } else if (id && capacity < countFor(id)) {
        setError(
          'errTaskCap',
          'Capacity cannot be lower than the number of registered volunteers.',
          'taskCap'
        );
        valid = false;
      } else {
        setError('errTaskCap', '', 'taskCap');
      }

      if (!valid) {
        showToast('Please fix the highlighted fields.', true);
        return;
      }

      const previousState = JSON.stringify(state);

      if (id) {
        const task = taskById(id);

        if (!task) return;

        task.name = name;
        task.desc = description;
        task.date = date;
        task.cap = capacity;
      } else {
        state.tasks.push({
          id: uid(),
          name,
          desc: description,
          date,
          cap: capacity,
          done: false
        });
      }

      if (!saveData()) {
        state = JSON.parse(previousState);
        return;
      }

      closeModal();
      renderAll();

      showToast(
        id ? 'Task updated successfully!' : 'Task added successfully!'
      );
    });

    /* =================================================
       TASK ACTIONS
       ================================================= */

    $('taskList').addEventListener('click', event => {
      const button = event.target.closest('button[data-act]');

      if (!button) return;

      const task = taskById(button.dataset.id);

      if (!task) return;

      const action = button.dataset.act;

      if (action === 'edit') {
        openModal(task);
        return;
      }

      if (action === 'toggle') {
        const oldStatus = task.done;
        task.done = !task.done;

        if (!saveData()) {
          task.done = oldStatus;
          return;
        }

        renderAll();

        showToast(
          task.done
            ? 'Task marked as completed!'
            : 'Task reopened successfully!'
        );

        return;
      }

      if (action === 'delete') {
        const volunteerCount = countFor(task.id);

        const message =
          `Delete "${task.name}"?` +
          (volunteerCount
            ? ` This will also remove ${volunteerCount} registered volunteer(s).`
            : '');

        if (!confirm(message)) return;

        const previousState = JSON.stringify(state);

        state.tasks = state.tasks.filter(
          item => item.id !== task.id
        );

        state.volunteers = state.volunteers.filter(
          volunteer => volunteer.taskId !== task.id
        );

        if (!saveData()) {
          state = JSON.parse(previousState);
          return;
        }

        renderAll();
        showToast('Task deleted successfully!');
      }
    });

    /* =================================================
       VOLUNTEER REGISTRATION
       ================================================= */

    $('regForm').addEventListener('submit', event => {
      event.preventDefault();

      const name = $('regName').value.trim().replace(/\s+/g, ' ');
      const contact = $('regContact').value.trim();
      const taskId = $('regTask').value;

      let valid = true;

      // NAME VALIDATION

      if (
        name.length < 2 ||
        !/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .,'-]*$/.test(name)
      ) {
        setError(
          'errName',
          'Enter a valid full name.',
          'regName'
        );
        valid = false;
      } else {
        setError('errName', '', 'regName');
      }

      // CONTACT VALIDATION

      const isEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

      const isPhone =
        /^\+?[0-9][0-9\s-]{6,14}$/.test(contact);

      if (!contact) {
        setError(
          'errContact',
          'Email or contact number is required.',
          'regContact'
        );
        valid = false;
      } else if (!isEmail && !isPhone) {
        setError(
          'errContact',
          'Enter a valid email or phone number.',
          'regContact'
        );
        valid = false;
      } else {
        setError('errContact', '', 'regContact');
      }

      // TASK VALIDATION

      const task = taskId ? taskById(taskId) : null;

      if (!task) {
        setError(
          'errTask',
          'Please select a task.',
          'regTask'
        );
        valid = false;
      } else if (task.done) {
        setError(
          'errTask',
          'This task is already completed.',
          'regTask'
        );
        valid = false;
      } else if (remaining(task) === 0) {
        setError(
          'errTask',
          'This task is already full.',
          'regTask'
        );
        valid = false;
      } else {
        setError('errTask', '', 'regTask');
      }

      // DUPLICATE CHECK

      if (valid) {
        const duplicate = state.volunteers.some(volunteer => {
          return volunteer.taskId === taskId &&
            (
              volunteer.contact.toLowerCase() === contact.toLowerCase() ||
              volunteer.name.toLowerCase() === name.toLowerCase()
            );
        });

        if (duplicate) {
          setError(
            'errContact',
            'This volunteer is already registered for this task.',
            'regContact'
          );
          valid = false;
        }
      }

      if (!valid) {
        showToast('Registration failed. Check the form.', true);
        return;
      }

      const volunteer = {
        id: uid(),
        name,
        contact,
        taskId,
        ts: Date.now()
      };

      state.volunteers.push(volunteer);

      if (!saveData()) {
        state.volunteers.pop();
        return;
      }

      $('regForm').reset();

      setError('errName', '', 'regName');
      setError('errContact', '', 'regContact');
      setError('errTask', '', 'regTask');

      renderAll();

      showToast(name + ' successfully registered!');
    });

    /* =================================================
       REMOVE VOLUNTEER
       ================================================= */

    $('volBody').addEventListener('click', event => {
      const button = event.target.closest('button[data-vid]');

      if (!button) return;

      const volunteer = state.volunteers.find(
        item => item.id === button.dataset.vid
      );

      if (!volunteer) return;

      if (!confirm(
        `Remove ${volunteer.name} from this task?`
      )) return;

      const previousState = JSON.stringify(state);

      state.volunteers = state.volunteers.filter(
        item => item.id !== volunteer.id
      );

      if (!saveData()) {
        state = JSON.parse(previousState);
        return;
      }

      renderAll();
      showToast('Volunteer removed. Slot is available again.');
    });

    /* =================================================
       SEARCH AND FILTERS
       ================================================= */

    $('searchInput').addEventListener('input', renderTasks);

    $('filterSelect').addEventListener('change', renderTasks);

    $('volFilter').addEventListener('change', renderVolunteers);

    /* =================================================
       CSV EXPORT
       ================================================= */

    function csvCell(value) {
      let text = String(value ?? '');

      // Prevent spreadsheet formula injection.
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text;
      }

      return '"' + text.replace(/"/g, '""') + '"';
    }

    $('exportBtn').addEventListener('click', () => {
      if (!state.tasks.length) {
        showToast('Nothing to export yet.', true);
        return;
      }

      const rows = [[
        'Task Name',
        'Task Description',
        'Event Date',
        'Task Status',
        'Volunteer Name',
        'Contact Information',
        'Date Registered'
      ]];

      state.tasks.forEach(task => {
        const volunteers = state.volunteers.filter(
          volunteer => volunteer.taskId === task.id
        );

        const taskStatus = LABELS[getStatus(task)];

        if (!volunteers.length) {
          rows.push([
            task.name,
            task.desc,
            task.date,
            taskStatus,
            '',
            '',
            ''
          ]);
        }

        volunteers.forEach(volunteer => {
          rows.push([
            task.name,
            task.desc,
            task.date,
            taskStatus,
            volunteer.name,
            volunteer.contact,
            formatTimestamp(volunteer.ts)
          ]);
        });
      });

      const csv = '\uFEFF' + rows.map(row =>
        row.map(csvCell).join(',')
      ).join('\r\n');

      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        'clubconnect-volunteers-' + localDate() + '.csv';

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      showToast('CSV report exported successfully!');
    });

    /* =================================================
       INITIALIZE APPLICATION
       ================================================= */

    renderAll();
    startSession();

  }

})();
