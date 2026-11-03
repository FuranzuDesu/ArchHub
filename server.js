let materials = [];

    // --- Fetch Data From Render Backend Database ---
    async function fetchMaterialsFromDB() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch from database');
        materials = await response.json();
        renderUI();
      } catch (err) {
        console.warn("Backend offline or connecting... using fallback state.", err);
      }
    }

    // --- Dynamic UI Rendering Engine ---
    function renderUI(filterQuery = '') {
      const filtered = materials.filter(m => 
        (m.name && m.name.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (m.site_location && m.site_location.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (m.status && m.status.toLowerCase().includes(filterQuery.toLowerCase()))
      );

      // KPI Calculations based on database rows
      document.getElementById('kpi-total').innerText = materials.length;
      document.getElementById('kpi-low').innerText = materials.filter(m => m.status === 'Low Stock' || m.quantity < 20).length;
      document.getElementById('kpi-pending').innerText = materials.filter(m => m.status === 'In Transit').length;
      document.getElementById('kpi-issues').innerText = materials.filter(m => m.status === 'Delayed').length;

      // Inventory Alerts Panel
      const alertList = document.getElementById('alert-list');
      alertList.innerHTML = '';
      materials.filter(m => m.status !== 'In Stock').forEach(item => {
        let badgeClass = 'badge-low';
        if (item.status === 'In Transit') badgeClass = 'badge-transit';
        if (item.status === 'Delayed') badgeClass = 'badge-delayed';

        alertList.innerHTML += `
          <div class="alert-item">
            <div>
              <strong>${item.name}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${item.site_location || item.site}</div>
            </div>
            <span class="badge ${badgeClass}">${item.status} (${item.quantity} units)</span>
          </div>
        `;
      });

      // Inventory Catalog Table
      const invBody = document.getElementById('inventoryTableBody');
      invBody.innerHTML = '';
      filtered.forEach(item => {
        let badgeClass = 'badge-stock';
        if (item.status === 'Low Stock') badgeClass = 'badge-low';
        if (item.status === 'In Transit') badgeClass = 'badge-transit';
        if (item.status === 'Delayed') badgeClass = 'badge-delayed';

        invBody.innerHTML += `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.category || 'General'}</td>
            <td>${item.quantity}</td>
            <td>${item.site_location || item.site}</td>
            <td><span class="badge ${badgeClass}">${item.status}</span></td>
            <td><button class="delete-btn" onclick="deleteMaterial(${item.id})"><i class="fa-solid fa-trash"></i></button></td>
          </tr>
        `;
      });

      // Delivery Tracker Table
      const devBody = document.getElementById('deliveryTableBody');
      devBody.innerHTML = '';
      filtered.forEach(item => {
        let badgeClass = item.status === 'In Transit' ? 'badge-transit' : (item.status === 'Delayed' ? 'badge-delayed' : 'badge-stock');
        devBody.innerHTML += `
          <tr>
            <td>SHP-${1000 + item.id}</td>
            <td>${item.name}</td>
            <td>${item.site_location || item.site}</td>
            <td>${item.status}</td>
            <td><span class="badge ${badgeClass}">${item.status}</span></td>
          </tr>
        `;
      });

      updateMapPins();
    }

    // --- Save New Shipment to PostgreSQL Database via POST ---
    document.getElementById('materialForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const siteCoordinates = {
        "Main Site": { lat: 8.9600, lng: 125.6000 },
        "Site B": { lat: 8.9450, lng: 125.5850 },
        "Site C": { lat: 8.9350, lng: 125.6150 }
      };

      const selectedSite = document.getElementById('matSite').value;
      const coords = siteCoordinates[selectedSite];

      const newItem = {
        name: document.getElementById('matName').value,
        category: document.getElementById('matCat').value,
        quantity: parseInt(document.getElementById('matQty').value),
        site_location: selectedSite,
        status: document.getElementById('matStatus').value,
        lat: coords.lat,
        lng: coords.lng
      };

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });

        if (!response.ok) throw new Error('Failed to save to database');
        
        // Refresh data directly from database
        await fetchMaterialsFromDB();
        closeModal();
        document.getElementById('materialForm').reset();
      } catch (err) {
        alert('Error saving to database: ' + err.message);
      }
    });

    // Initial Load from Database on Startup
    fetchMaterialsFromDB();