/**
 * SHOPORA — Profile, Address Management & Notifications Controller
 * "Discover More. Shop Smarter."
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Components.renderNavbar('profile');
  Components.renderFooter();

  if (!Auth.isAuthenticated()) {
    Components.showToast('Please sign in to access your account center', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html?redirect=profile.html';
    }, 600);
    return;
  }

  let user = Auth.getUser();

  // Elements
  const profName = document.getElementById('prof-name');
  const profEmail = document.getElementById('prof-email');
  const profAvatar = document.getElementById('prof-avatar');
  const profRole = document.getElementById('prof-role-badge');
  const profProBadge = document.getElementById('prof-pro-badge');
  const signoutBtn = document.getElementById('profile-signout-btn');

  // Tabs
  const tabBtns = document.querySelectorAll('.profile-tab-btn[data-tab]');
  const viewSettings = document.getElementById('tab-settings-view');
  const viewAddresses = document.getElementById('tab-addresses-view');
  const viewPro = document.getElementById('tab-pro-view');
  const viewNotifications = document.getElementById('tab-notifications-view');
  const profProContent = document.getElementById('prof-pro-content');

  // Settings inputs
  const editName = document.getElementById('edit-name');
  const editPhone = document.getElementById('edit-phone');
  const editEmail = document.getElementById('edit-email');
  const editNewPwd = document.getElementById('edit-new-pwd');
  const editConfirmPwd = document.getElementById('edit-confirm-pwd');
  const profileForm = document.getElementById('profile-update-form');

  // Addresses elements
  const addressesContainer = document.getElementById('addresses-list-container');
  const openAddrModalBtn = document.getElementById('open-new-address-modal-btn');
  const addrModal = document.getElementById('address-modal-backdrop');
  const closeAddrModal = document.getElementById('close-address-modal');
  const cancelAddrBtn = document.getElementById('cancel-addr-modal-btn');
  const newAddrForm = document.getElementById('new-address-modal-form');

  // Notifications elements
  const notificationsContainer = document.getElementById('notifications-list-container');
  const markAllReadBtn = document.getElementById('mark-all-notifications-read-btn');

  // Populate user header
  function populateUserHeader(u) {
    if (!u) return;
    profName.textContent = u.name || 'Customer';
    profEmail.textContent = u.email || '';
    profAvatar.textContent = (u.name || 'U').charAt(0).toUpperCase();
    profRole.textContent = (u.role || 'user').toUpperCase();

    if (profProBadge) {
      if (u.isPro) {
        profProBadge.style.display = 'inline-block';
        profProBadge.textContent = u.proPlan === 'trial' ? '👑 PRO TRIAL' : '👑 PRO MEMBER';
      } else {
        profProBadge.style.display = 'none';
      }
    }

    if (editName) editName.value = u.name || '';
    if (editPhone) editPhone.value = u.phone || '';
    if (editEmail) editEmail.value = u.email || '';
  }

  populateUserHeader(user);

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      if (viewSettings) viewSettings.style.display = tab === 'settings' ? 'block' : 'none';
      if (viewAddresses) viewAddresses.style.display = tab === 'addresses' ? 'block' : 'none';
      if (viewPro) viewPro.style.display = tab === 'pro' ? 'block' : 'none';
      if (viewNotifications) viewNotifications.style.display = tab === 'notifications' ? 'block' : 'none';

      if (tab === 'addresses') loadAddresses();
      if (tab === 'pro') loadProMembership();
      if (tab === 'notifications') loadNotifications();
    });
  });

  // Check URL hash
  if (window.location.hash === '#addresses') {
    const addrTab = document.querySelector('.profile-tab-btn[data-tab="addresses"]');
    if (addrTab) addrTab.click();
  } else if (window.location.hash === '#pro') {
    const proTab = document.querySelector('.profile-tab-btn[data-tab="pro"]');
    if (proTab) proTab.click();
  }

  // Sign out
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      Auth.logout();
    });
  }

  // Profile Update Form
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = editName.value.trim();
      const phone = editPhone.value.trim();
      const password = editNewPwd.value;
      const confirmPassword = editConfirmPwd.value;

      if (password && password.length < 6) {
        Components.showToast('Password must be at least 6 characters long', 'error');
        return;
      }

      if (password && password !== confirmPassword) {
        Components.showToast('Passwords do not match', 'error');
        return;
      }

      try {
        const payload = { name, phone };
        if (password) payload.password = password;

        const res = await API.put('/auth/profile', payload);

        if (res.success) {
          Auth.setUser(res.data);
          user = res.data;
          populateUserHeader(user);
          editNewPwd.value = '';
          editConfirmPwd.value = '';
          Components.showToast('Profile information saved successfully', 'success');
        } else {
          Components.showToast(res.message || 'Could not update profile', 'error');
        }
      } catch (err) {
        Components.showToast(err.message || 'Error saving profile', 'error');
      }
    });
  }

  /**
   * Load Saved Addresses
   */
  async function loadAddresses() {
    if (!addressesContainer) return;
    try {
      const res = await API.get('/auth/addresses');
      const addresses = res.data || [];

      if (addresses.length === 0) {
        addressesContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-subtle); border-radius: 12px;">
            <p style="color: var(--text-muted); margin-bottom: 16px;">You don't have any saved shipping addresses yet.</p>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('open-new-address-modal-btn').click()">
              + Add First Address
            </button>
          </div>
        `;
        return;
      }

      addressesContainer.innerHTML = addresses
        .map(
          (addr) => {
            const typeClass = (addr.addressType || 'Home').toLowerCase();
            return `
        <div class="address-card-item">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: var(--text-main); font-size: 0.95rem;">${addr.fullName}</strong>
              <span class="badge-addr-type ${typeClass}">${addr.addressType || 'Home'}</span>
            </div>
            ${addr.isDefault ? `<span style="font-size: 0.7rem; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 9999px;">DEFAULT</span>` : ''}
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 14px;">
            ${addr.addressLine1 || addr.street || ''}${addr.landmark ? '<br/><span style="color: #64748b; font-size: 0.8rem;">Landmark: ' + addr.landmark + '</span>' : ''}<br />
            ${addr.city}, ${addr.state} ${addr.pincode || addr.postalCode || ''}<br />
            📞 ${addr.phone}
          </p>

          <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
            ${
              !addr.isDefault
                ? `
              <button class="btn btn-outline btn-sm set-default-addr-btn" data-id="${addr._id}" style="font-size: 0.75rem; padding: 4px 10px;">
                Set Default
              </button>
            `
                : ''
            }
            <button class="btn btn-outline btn-sm delete-addr-btn" data-id="${addr._id}" style="font-size: 0.75rem; padding: 4px 10px; color: var(--danger); border-color: #fecaca;">
              Delete
            </button>
          </div>
        </div>
      `;
          }
        )
        .join('');

      // Set default address
      addressesContainer.querySelectorAll('.set-default-addr-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await API.put(`/auth/addresses/${btn.dataset.id}/default`);
            Components.showToast('Default address updated', 'success');
            await loadAddresses();
          } catch (err) {
            Components.showToast(err.message || 'Failed to update default address', 'error');
          }
        });
      });

      // Delete address
      addressesContainer.querySelectorAll('.delete-addr-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          Components.confirmModal({
            title: 'Delete Address?',
            message: 'Are you sure you want to remove this delivery address?',
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
              try {
                await API.delete(`/auth/addresses/${btn.dataset.id}`);
                Components.showToast('Address deleted', 'info');
                await loadAddresses();
              } catch (err) {
                Components.showToast(err.message || 'Failed to delete address', 'error');
              }
            },
          });
        });
      });
    } catch (err) {
      console.warn('Failed to load addresses:', err);
      addressesContainer.innerHTML = `<p style="color: #dc2626;">Unable to load addresses.</p>`;
    }
  }

  // Address Modal Controls
  if (openAddrModalBtn) openAddrModalBtn.addEventListener('click', () => (addrModal.style.display = 'flex'));
  if (closeAddrModal) closeAddrModal.addEventListener('click', () => (addrModal.style.display = 'none'));
  if (cancelAddrBtn) cancelAddrBtn.addEventListener('click', () => (addrModal.style.display = 'none'));

  // Profile Address Type Pills
  document.querySelectorAll('.prof-addr-type-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.prof-addr-type-pill').forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
      const hidden = document.getElementById('addr-type');
      if (hidden) hidden.value = pill.dataset.type;
    });
  });

  // Profile Pincode Lookup
  const profPinInput = document.getElementById('addr-pincode');
  const profPinHint = document.getElementById('prof-pincode-hint');
  const profCityInput = document.getElementById('addr-city');
  const profStateInput = document.getElementById('addr-state');

  const PROF_PIN_DIR = {
    '560': { city: 'Bengaluru', state: 'Karnataka' },
    '400': { city: 'Mumbai', state: 'Maharashtra' },
    '110': { city: 'New Delhi', state: 'Delhi' },
    '500': { city: 'Hyderabad', state: 'Telangana' },
    '600': { city: 'Chennai', state: 'Tamil Nadu' },
    '700': { city: 'Kolkata', state: 'West Bengal' },
    '411': { city: 'Pune', state: 'Maharashtra' },
    '380': { city: 'Ahmedabad', state: 'Gujarat' },
    '302': { city: 'Jaipur', state: 'Rajasthan' },
    '122': { city: 'Gurugram', state: 'Haryana' },
    '201': { city: 'Noida', state: 'Uttar Pradesh' },
    '682': { city: 'Kochi', state: 'Kerala' },
    '97477': { city: 'Springfield', state: 'OR' },
  };

  if (profPinInput) {
    profPinInput.addEventListener('input', () => {
      const val = profPinInput.value.trim();
      const match = PROF_PIN_DIR[val] || PROF_PIN_DIR[val.slice(0, 3)];
      if (match) {
        if (profPinHint) {
          profPinHint.style.display = 'block';
          profPinHint.innerHTML = `✓ ${match.city}, ${match.state}`;
        }
        if (val.length >= 5) {
          if (profCityInput && !profCityInput.value) profCityInput.value = match.city;
          if (profStateInput && !profStateInput.value) profStateInput.value = match.state;
        }
      } else if (profPinHint) {
        profPinHint.style.display = 'none';
      }
    });
  }

  if (newAddrForm) {
    newAddrForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('addr-fullname').value.trim();
      const phone = document.getElementById('addr-phone').value.trim();
      const addressLine1 = document.getElementById('addr-street').value.trim();
      const landmark = (document.getElementById('addr-landmark')?.value || '').trim();
      const city = document.getElementById('addr-city').value.trim();
      const state = document.getElementById('addr-state').value.trim();
      const pincode = document.getElementById('addr-pincode').value.trim();
      const addressType = document.getElementById('addr-type')?.value || 'Home';
      const isDefault = document.getElementById('addr-is-default').checked;

      try {
        const res = await API.post('/auth/addresses', {
          fullName,
          phone,
          addressLine1,
          street: addressLine1,
          landmark,
          city,
          state,
          pincode,
          postalCode: pincode,
          addressType,
          isDefault,
          country: 'India',
        });

        if (res.success) {
          Components.showToast('New shipping address saved to MongoDB!', 'success');
          addrModal.style.display = 'none';
          newAddrForm.reset();
          await loadAddresses();
        } else {
          Components.showToast(res.message || 'Failed to save address', 'error');
        }
      } catch (err) {
        Components.showToast(err.message || 'Error saving address', 'error');
      }
    });
  }

  /**
   * Load Notifications
   */
  async function loadNotifications() {
    if (!notificationsContainer) return;
    try {
      const res = await API.get('/notifications');
      const notifications = res.data || [];

      if (notifications.length === 0) {
        notificationsContainer.innerHTML = `
          <div style="text-align: center; padding: 48px; color: var(--text-muted);">
            🔔 You have no new notifications right now.
          </div>
        `;
        return;
      }

      notificationsContainer.innerHTML = notifications
        .map(
          (n) => `
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; gap: 14px; background: ${n.isRead ? '#ffffff' : 'var(--primary-soft)'};">
          <div style="font-size: 1.25rem;">📦</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
              <strong style="font-size: 0.925rem; color: var(--text-main);">${n.title}</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${Utils.formatDate(n.createdAt)}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${n.message}</p>
            ${n.link ? `<a href="${n.link}" style="font-size: 0.8rem; color: var(--primary); font-weight: 700; display: inline-block; margin-top: 6px;">View details &rarr;</a>` : ''}
          </div>
        </div>
      `
        )
        .join('');
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
      try {
        await API.put('/notifications/mark-read');
        Components.showToast('All notifications marked as read', 'success');
        loadNotifications();
      } catch (e) {
        Components.showToast('Could not mark notifications as read', 'error');
      }
    });
  }

  /**
   * Load SHOPORA PRO Membership Details
   */
  async function loadProMembership() {
    if (!profProContent) return;
    profProContent.innerHTML = '<p style="color: var(--text-muted); padding: 20px 0;">Loading your membership details from MongoDB...</p>';

    try {
      const res = await API.get('/auth/pro/status');
      if (!res.success) {
        profProContent.innerHTML = '<p style="color: var(--danger);">Failed to load membership details.</p>';
        return;
      }

      const { isPro, proPlan, proExpiresAt, daysRemaining, proTrialUsed } = res.data;

      // Also update stored user session & UI badge
      user.isPro = isPro;
      user.proPlan = proPlan;
      user.proExpiresAt = proExpiresAt;
      Auth.setUser(user);
      populateUserHeader(user);

      if (isPro) {
        const planTitles = {
          trial: '30-Day Free Trial',
          monthly: 'Monthly Pro Member',
          annual: 'Annual VIP Pro Member',
        };
        const planTitle = planTitles[proPlan] || 'Active Pro Member';
        const expiryFormatted = proExpiresAt ? new Date(proExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';

        profProContent.innerHTML = `
          <div style="background: linear-gradient(135deg, #090e17 0%, #172554 100%); border-radius: var(--radius-lg); padding: 28px; color: #ffffff; margin-bottom: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(30, 58, 138, 0.4);">
            <div style="position: absolute; right: -20px; top: -20px; font-size: 8rem; opacity: 0.08; pointer-events: none;">👑</div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
              <div>
                <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 8px;">
                  👑 ${planTitle}
                </span>
                <h3 style="font-size: 1.6rem; font-weight: 800; color: #ffffff; margin: 0;">SHOPORA PRO ACTIVE</h3>
              </div>
              <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px); padding: 10px 18px; border-radius: var(--radius-md); text-align: right; border: 1px solid rgba(255, 255, 255, 0.15);">
                <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Status</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #34d399;">Active • ${daysRemaining} Days Left</div>
              </div>
            </div>

            <div style="font-size: 0.875rem; color: #cbd5e1; margin-bottom: 20px;">
              Your PRO benefits are active and guaranteed on all orders until <strong>${expiryFormatted}</strong>.
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px;">
              <div style="background: rgba(255, 255, 255, 0.06); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="font-size: 1.3rem; margin-bottom: 4px;">⚡</div>
                <strong style="display: block; font-size: 0.9rem; color: #ffffff; margin-bottom: 2px;">Lightning Express</strong>
                <span style="font-size: 0.8rem; color: #94a3b8;">100% Free on all eligible items (saved ₹149/order)</span>
              </div>
              <div style="background: rgba(255, 255, 255, 0.06); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="font-size: 1.3rem; margin-bottom: 4px;">🏷️</div>
                <strong style="display: block; font-size: 0.9rem; color: #ffffff; margin-bottom: 2px;">Extra 5% Off</strong>
                <span style="font-size: 0.8rem; color: #94a3b8;">Automatically deducted at checkout on entire cart</span>
              </div>
              <div style="background: rgba(255, 255, 255, 0.06); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="font-size: 1.3rem; margin-bottom: 4px;">👑</div>
                <strong style="display: block; font-size: 0.9rem; color: #ffffff; margin-bottom: 2px;">VIP Concierge</strong>
                <span style="font-size: 0.8rem; color: #94a3b8;">Priority customer support & fast-lane dispatch</span>
              </div>
              <div style="background: rgba(255, 255, 255, 0.06); padding: 14px; border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="font-size: 1.3rem; margin-bottom: 4px;">🔄</div>
                <strong style="display: block; font-size: 0.9rem; color: #ffffff; margin-bottom: 2px;">30-Day Returns</strong>
                <span style="font-size: 0.8rem; color: #94a3b8;">Zero questions asked instant doorstep pickup</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
              <a href="pro.html" class="btn btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 700; padding: 10px 22px;">
                Upgrade / Switch Plan
              </a>
              <button id="prof-cancel-pro-btn" class="btn btn-outline" style="color: #fca5a5; border-color: rgba(248, 113, 113, 0.4); padding: 10px 20px; font-weight: 600;">
                Cancel Membership
              </button>
            </div>
          </div>
        `;

        const cancelBtn = document.getElementById('prof-cancel-pro-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to cancel your SHOPORA PRO membership? You will lose Free Lightning Express Delivery and your 5% checkout discount.')) {
              return;
            }
            try {
              const cancelRes = await API.post('/auth/pro/cancel');
              if (cancelRes.success) {
                Components.showToast('Your SHOPORA PRO membership has been cancelled', 'info');
                await loadProMembership();
              } else {
                Components.showToast(cancelRes.message || 'Failed to cancel membership', 'error');
              }
            } catch (err) {
              Components.showToast(err.message || 'Error cancelling membership', 'error');
            }
          });
        }
      } else {
        // User is not PRO
        profProContent.innerHTML = `
          <div style="background: linear-gradient(135deg, #090e17 0%, #1e293b 100%); border-radius: var(--radius-lg); padding: 32px; color: #ffffff; text-align: center; margin-bottom: 24px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);">
            <div style="font-size: 3rem; margin-bottom: 12px;">👑</div>
            <h3 style="font-size: 1.75rem; font-weight: 800; color: #ffffff; margin-bottom: 8px;">Experience Shopping Like Royalty</h3>
            <p style="font-size: 0.95rem; color: #94a3b8; max-width: 580px; margin: 0 auto 24px; line-height: 1.5;">
              Upgrade to <strong>SHOPORA PRO</strong> to enjoy 100% Free Lightning Express Delivery, extra 5% member discount on every order, VIP concierge support, and early access to sales.
            </p>

            <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin-bottom: 28px;">
              ${!proTrialUsed ? `
                <button id="prof-activate-trial-btn" class="btn btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 800; padding: 12px 28px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                  ⚡ Start 30-Day Free Trial (₹0 Today)
                </button>
              ` : `
                <a href="pro.html" class="btn btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; font-weight: 800; padding: 12px 28px;">
                  👑 Join SHOPORA PRO (from ₹199/mo)
                </a>
              `}
              <a href="pro.html" class="btn btn-outline" style="color: #ffffff; border-color: rgba(255, 255, 255, 0.2); padding: 12px 24px;">
                Compare All Plans &amp; Perks &rarr;
              </a>
            </div>

            <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; text-align: left;">
              <div>
                <div style="font-size: 1.2rem; margin-bottom: 4px;">⚡ Free Express Shipping</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">Save ₹149 on every single express order.</div>
              </div>
              <div>
                <div style="font-size: 1.2rem; margin-bottom: 4px;">🏷️ Extra 5% Discount</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">Automatic deduction across our entire catalog.</div>
              </div>
              <div>
                <div style="font-size: 1.2rem; margin-bottom: 4px;">👑 VIP Fast-Track</div>
                <div style="font-size: 0.8rem; color: #94a3b8;">Guaranteed next-day dispatch priority.</div>
              </div>
            </div>
          </div>
        `;

        const trialBtn = document.getElementById('prof-activate-trial-btn');
        if (trialBtn) {
          trialBtn.addEventListener('click', async () => {
            trialBtn.disabled = true;
            trialBtn.textContent = 'Activating Free Trial...';
            try {
              const actRes = await API.post('/auth/pro/activate', { plan: 'trial' });
              if (actRes.success) {
                Components.showToast('🎉 30-Day SHOPORA PRO Free Trial Activated!', 'success');
                await loadProMembership();
              } else {
                Components.showToast(actRes.message || 'Failed to activate trial', 'error');
                trialBtn.disabled = false;
                trialBtn.textContent = '⚡ Start 30-Day Free Trial (₹0 Today)';
              }
            } catch (err) {
              Components.showToast(err.message || 'Error activating trial', 'error');
              trialBtn.disabled = false;
              trialBtn.textContent = '⚡ Start 30-Day Free Trial (₹0 Today)';
            }
          });
        }
      }
    } catch (err) {
      profProContent.innerHTML = `<p style="color: var(--danger); padding: 20px 0;">Error loading Pro details: ${err.message}</p>`;
    }
  }
});
