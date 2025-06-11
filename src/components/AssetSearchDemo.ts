/**
 * Asset Search Demo
 * Demonstrates the powerful search capabilities for the large asset collection
 */

import { assetSearch, SearchFilters } from '../services/AssetSearch';
import { createAssetImage } from './AssetImage';

export class AssetSearchDemo {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async initialize() {
    await assetSearch.initialize();
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="asset-search-demo">
        <h2>🔍 Asset Search Demo - 6,472 Assets Indexed</h2>
        
        <div class="search-controls">
          <div class="search-box">
            <input type="text" id="search-input" placeholder="Search assets (e.g., 'fire sword', 'healing potion', 'ui button')" />
            <button id="search-btn">Search</button>
          </div>
          
          <div class="filters">
            <select id="collection-filter">
              <option value="">All Collections</option>
              <option value="fantasy-icons">Fantasy Icons (6,295)</option>
              <option value="classic-rpg-gui">Classic RPG GUI (173)</option>
              <option value="custom">Custom (4)</option>
            </select>
            
            <select id="equipment-filter">
              <option value="">All Equipment</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor</option>
              <option value="accessory">Accessories</option>
            </select>
            
            <select id="theme-filter">
              <option value="">All Themes</option>
              <option value="fire">Fire</option>
              <option value="ice">Ice</option>
              <option value="dark">Dark</option>
              <option value="holy">Holy</option>
              <option value="nature">Nature</option>
            </select>
          </div>
          
          <div class="quick-searches">
            <button class="quick-btn" data-search="fire sword">🔥 Fire Swords</button>
            <button class="quick-btn" data-search="healing potion">🧪 Healing Potions</button>
            <button class="quick-btn" data-search="gold ring">💍 Gold Rings</button>
            <button class="quick-btn" data-search="dragon helmet">🐉 Dragon Helmets</button>
            <button class="quick-btn" data-search="ui button">🖱️ UI Buttons</button>
          </div>
        </div>
        
        <div class="search-stats">
          <div id="stats-display"></div>
        </div>
        
        <div class="search-results">
          <div id="results-header"></div>
          <div id="results-grid"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.displayStats();
    this.performSearch('sword'); // Default search
  }

  private attachEventListeners() {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
    const quickBtns = document.querySelectorAll('.quick-btn');

    searchBtn.addEventListener('click', () => this.performSearch(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch(searchInput.value);
    });

    quickBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const search = target.dataset.search || '';
        searchInput.value = search;
        this.performSearch(search);
      });
    });

    // Filter change listeners
    ['collection-filter', 'equipment-filter', 'theme-filter'].forEach(id => {
      const element = document.getElementById(id) as HTMLSelectElement;
      element.addEventListener('change', () => this.performFilteredSearch());
    });
  }

  private async performSearch(query: string) {
    if (!query.trim()) return;

    const startTime = performance.now();
    const results = assetSearch.searchByQuery(query, { 
      limit: 50, 
      fuzzy: true,
      sortBy: 'relevance'
    });
    const searchTime = performance.now() - startTime;

    this.displayResults(results, query, searchTime);
  }

  private async performFilteredSearch() {
    const collectionFilter = (document.getElementById('collection-filter') as HTMLSelectElement).value;
    const equipmentFilter = (document.getElementById('equipment-filter') as HTMLSelectElement).value;
    const themeFilter = (document.getElementById('theme-filter') as HTMLSelectElement).value;

    const filters: SearchFilters = {};
    if (collectionFilter) filters.collection = collectionFilter as any;
    if (equipmentFilter) filters.equipment = equipmentFilter as any;
    if (themeFilter) filters.theme = [themeFilter];

    const startTime = performance.now();
    const results = assetSearch.searchWithFilters(filters, { limit: 50 });
    const searchTime = performance.now() - startTime;

    this.displayResults(results, 'Filtered Results', searchTime);
  }

  private async displayResults(results: any[], query: string, searchTime: number) {
    const header = document.getElementById('results-header')!;
    const grid = document.getElementById('results-grid')!;

    header.innerHTML = `
      <h3>📊 Results for "${query}"</h3>
      <p>Found ${results.length} assets in ${searchTime.toFixed(2)}ms</p>
    `;

    grid.innerHTML = '';
    grid.className = 'results-grid';

    for (const asset of results.slice(0, 20)) { // Show first 20 results
      const item = document.createElement('div');
      item.className = 'result-item';
      
      try {
        const img = await createAssetImage(asset.path, {
          onError: () => console.warn(`Failed to load ${asset.path}`)
        });
        img.className = 'result-image';
        img.title = asset.path;
        
        item.appendChild(img);
        
        const info = document.createElement('div');
        info.className = 'result-info';
        info.innerHTML = `
          <div class="result-name">${asset.path.split('/').pop()}</div>
          <div class="result-tags">${asset.tags.slice(0, 3).join(', ')}</div>
          <div class="result-size">${(asset.metadata.fileSize / 1024).toFixed(1)}KB</div>
        `;
        
        item.appendChild(info);
        grid.appendChild(item);
      } catch (error) {
        console.warn(`Error displaying ${asset.path}:`, error);
      }
    }
  }

  private displayStats() {
    const stats = assetSearch.getCollectionStats();
    if (!stats) return;

    const display = document.getElementById('stats-display')!;
    display.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <h4>${stats.totalAssets.toLocaleString()}</h4>
          <p>Total Assets</p>
        </div>
        <div class="stat-item">
          <h4>${stats.searchIndexSize.toLocaleString()}</h4>
          <p>Searchable Tags</p>
        </div>
        <div class="stat-item">
          <h4>${Object.keys(stats.collections).length}</h4>
          <p>Collections</p>
        </div>
        <div class="stat-item">
          <h4>${stats.topTags[0]?.count || 0}</h4>
          <p>Most Common Tag</p>
        </div>
      </div>
      
      <div class="top-tags">
        <h4>🏷️ Top Tags:</h4>
        <div class="tag-list">
          ${stats.topTags.slice(0, 10).map(tag => 
            `<span class="tag">${tag.tag} (${tag.count})</span>`
          ).join('')}
        </div>
      </div>
    `;
  }
}

// Styles
const styles = `
<style>
.asset-search-demo {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.search-controls {
  margin-bottom: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.search-box input {
  flex: 1;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-box button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filters select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.quick-searches {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 8px 15px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.quick-btn:hover {
  background: #218838;
}

.search-stats {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #e9ecef;
  border-radius: 8px;
}

.stat-item h4 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #007bff;
}

.stat-item p {
  margin: 0;
  color: #6c757d;
}

.top-tags {
  margin-top: 15px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
}

.tag {
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.result-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  background: white;
  transition: transform 0.2s;
}

.result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.result-image {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 8px;
}

.result-info {
  font-size: 12px;
}

.result-name {
  font-weight: bold;
  margin-bottom: 4px;
  word-break: break-word;
}

.result-tags {
  color: #666;
  margin-bottom: 4px;
}

.result-size {
  color: #999;
  font-size: 10px;
}
</style>
`;

// Inject styles
if (!document.getElementById('asset-search-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'asset-search-styles';
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}