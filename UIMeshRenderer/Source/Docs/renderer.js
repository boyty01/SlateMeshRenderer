/**
 * DMT Docs Renderer
 * Reads window.PLUGIN_DATA and builds the full documentation page.
 *
 * JSON schema reference: see dmt-ai-v2.js for a complete example.
 *
 * To use for a new plugin:
 *   1. Copy index.html, style.css, renderer.js to the plugin's Docs folder.
 *   2. Create a new <plugin-name>.js that sets window.PLUGIN_DATA = { ... }.
 *   3. In index.html, update the data <script> src to your new file.
 */
(function () {
    'use strict';

    // ── UTILITIES ─────────────────────────────────────────────────────────────

    /** Escape HTML entities so raw strings are safe for innerHTML assignment. */
    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Light markup for description strings.
     * `code` → <code>code</code>
     * **bold** → <strong>bold</strong>
     * Input is otherwise treated as plain text (HTML-escaped first).
     */
    function md(str) {
        if (str == null) return '';
        return esc(str)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }

    /** Build a meta-tag span. */
    function metaTag(tag) {
        return `<span class="meta-tag ${esc(tag.cls)}">${esc(tag.text)}</span>`;
    }

    /** Build a row of meta tags wrapped in .meta-tags, or empty string. */
    function metaTags(tags) {
        if (!tags || !tags.length) return '';
        return `<div class="meta-tags">${tags.map(metaTag).join('')}</div>`;
    }

    /** Callout icons by type. */
    const CALLOUT_ICONS = { note: 'ℹ', tip: '💡', warn: '⚠' };

    function renderCallout(c) {
        return `
        <div class="callout callout-${esc(c.type)}">
            <span class="callout-icon">${CALLOUT_ICONS[c.type] || 'ℹ'}</span>
            <span>${md(c.text)}</span>
        </div>`;
    }

    // ── MEMBER GROUP RENDERERS ────────────────────────────────────────────────

    /**
     * Property table — 4 columns: Name | Type | Default | Description+meta
     * rows: [{ name, type, default?, desc, meta?: [{text,cls}] }]
     */
    function renderPropertyTable(group) {
        const rows = group.rows.map(r => `
            <tr>
                <td><span class="member-name">${esc(r.name)}</span></td>
                <td><span class="member-type">${esc(r.type)}</span></td>
                <td><span class="member-default">${esc(r.default || '—')}</span></td>
                <td><span class="member-desc">${md(r.desc)}${metaTags(r.meta)}</span></td>
            </tr>`).join('');
        return `
        <table class="member-table">
            <thead><tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    /**
     * Function table — 2 columns: Signature | Description+meta
     * rows: [{ sig, desc, meta?: [{text,cls}] }]
     */
    function renderFunctionTable(group) {
        const rows = group.rows.map(r => `
            <tr>
                <td><span class="member-name">${esc(r.sig)}</span></td>
                <td><span class="member-desc">${md(r.desc)}${metaTags(r.meta)}</span></td>
            </tr>`).join('');
        return `
        <table class="member-table">
            <thead><tr><th>Signature</th><th>Description</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    /**
     * Enum block(s).
     * enums: [{ name, type?, values: [{name, desc}] }]
     */
    function renderEnumBlock(group) {
        return group.enums.map(e => `
        <div class="enum-block">
            <div class="enum-block-title">${esc(e.name)}${e.type ? ` (${esc(e.type)})` : ''}</div>
            ${e.values.map(v => `
            <div class="enum-row">
                <span class="er-name">${esc(v.name)}</span>
                <span class="er-desc">${md(v.desc)}</span>
            </div>`).join('')}
        </div>`).join('');
    }

    /**
     * Struct block(s).
     * structs: [{ name, fields: [{name, desc}] }]
     */
    function renderStructBlock(group) {
        return group.structs.map(s => `
        <div class="struct-block">
            <div class="struct-block-title">${esc(s.name)}</div>
            ${s.fields.map(f => `
            <div class="enum-row">
                <span class="er-name">${esc(f.name)}</span>
                <span class="er-desc">${md(f.desc)}</span>
            </div>`).join('')}
        </div>`).join('');
    }

    /**
     * Delegate list.
     * delegates: [{ sig, desc }]
     */
    function renderDelegateList(group) {
        return group.delegates.map(d => `
        <div class="delegate-item">
            <div class="delegate-sig">${esc(d.sig)}</div>
            <div class="delegate-desc">${md(d.desc)}</div>
        </div>`).join('');
    }

    /**
     * Callout list (inline callouts as a group).
     * callouts: [{ type, text }]
     */
    function renderCalloutGroup(group) {
        return group.callouts.map(renderCallout).join('');
    }

    /**
     * Paragraph list.
     * paragraphs: ["text", ...]
     */
    function renderParagraphs(group) {
        return group.paragraphs.map(p => `<p>${md(p)}</p>`).join('');
    }

    /** Dispatch a member group to the correct renderer. */
    const GROUP_RENDERERS = {
        propertyTable:  renderPropertyTable,
        functionTable:  renderFunctionTable,
        enumBlock:      renderEnumBlock,
        structBlock:    renderStructBlock,
        delegateList:   renderDelegateList,
        calloutGroup:   renderCalloutGroup,
        paragraphs:     renderParagraphs,
    };

    function renderMemberGroup(group) {
        const renderer = GROUP_RENDERERS[group.type];
        if (!renderer) {
            console.warn('renderer.js: unknown group type:', group.type);
            return '';
        }
        return `
        <div class="member-group">
            <div class="member-group-title">${esc(group.title)}</div>
            ${renderer(group)}
        </div>`;
    }

    // ── CLASS CARD ────────────────────────────────────────────────────────────

    function renderParentChain(cls) {
        const chain = [...(cls.parents || []), cls.name];
        return chain.map((p, i) =>
            i < chain.length - 1
                ? `${esc(p)}<span class="arrow"> › </span>`
                : `<span class="parent">${esc(p)}</span>`
        ).join('');
    }

    function renderClass(cls) {
        const badges = (cls.badges || [])
            .map(b => `<span class="badge ${esc(b.cls)}">${esc(b.text)}</span>`)
            .join('');

        const body = (cls.body || []).map(renderMemberGroup).join('');

        const callouts = (cls.callouts || []).map(renderCallout).join('');

        return `
        <div class="class-card" id="${esc(cls.id)}">
            <div class="class-header">
                <div>
                    <div class="class-name">${esc(cls.name)}</div>
                    <div class="class-parents">${renderParentChain(cls)}</div>
                    <div class="class-description">${md(cls.description)}</div>
                    <div class="badge-row">${badges}</div>
                </div>
            </div>
            <div class="class-body">
                ${body}
                ${callouts}
            </div>
        </div>`;
    }

    // ── OVERVIEW ──────────────────────────────────────────────────────────────

    function renderOverview(D) {
        const ov = D.overview;
        const callouts = (ov.callouts || []).map(renderCallout).join('');
        return `
        <section class="doc-section" id="overview">
            <h1 class="page-title">${esc(ov.title)}</h1>
            <p class="page-subtitle">${md(ov.subtitle)}</p>
            ${ov.body ? `<p>${md(ov.body)}</p>` : ''}
            ${callouts}
        </section>`;
    }

    // ── ARCHITECTURE ──────────────────────────────────────────────────────────

    function renderArchitecture(D) {
        const arch = D.architecture;
        const layers = (arch.layers || []).map(l => `
        <div class="arch-card">
            <div class="arch-layer-num">Layer ${l.num}</div>
            <div class="arch-layer-name">${esc(l.name)}</div>
            <ul class="arch-items">${l.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>`).join('');

        return `
        <section class="doc-section" id="architecture">
            <h2 class="section-title">Architecture</h2>
            ${arch.body ? `<p>${md(arch.body)}</p>` : ''}
            <div class="arch-grid">${layers}</div>
        </section>`;
    }

    // ── WORKFLOWS ─────────────────────────────────────────────────────────────

    function renderWorkflows(D) {
        const wfs = (D.workflows || []).map(wf => {
            const steps = wf.steps.map(s => `<li>${md(s)}</li>`).join('');
            return `
            <div class="workflow">
                <div class="workflow-title">${esc(wf.title)}</div>
                <ol class="workflow-steps">${steps}</ol>
            </div>`;
        }).join('');

        return `
        <section class="doc-section" id="workflows">
            <h2 class="section-title">Workflows</h2>
            ${wfs}
        </section>`;
    }

    // ── CLASS GROUPS ──────────────────────────────────────────────────────────

    /** Renders a heading section then all class cards belonging to that group. */
    function renderGroup(group, classMap) {
        const cards = group.classes
            .map(id => classMap[id])
            .filter(Boolean)
            .map(renderClass)
            .join('');

        return `
        <section class="doc-section" id="${esc(group.id)}">
            <h2 class="section-title">${esc(group.label)}</h2>
        </section>
        ${cards}`;
    }

    // ── DELEGATES REFERENCE ───────────────────────────────────────────────────

    function renderDelegatesRef(D) {
        const items = (D.delegatesRef || []).map(d => `
        <div class="delegate-item">
            <div class="delegate-sig">${esc(d.sig)}</div>
            <div class="delegate-desc">${md(d.desc)}</div>
        </div>`).join('');

        return `
        <section class="doc-section" id="delegates">
            <h2 class="section-title">Delegates Reference</h2>
            ${items}
        </section>`;
    }

    // ── TOPBAR ────────────────────────────────────────────────────────────────

    function renderTopbar(D) {
        document.title = `${D.plugin.name} — Plugin API Reference`;
        document.getElementById('topbar').innerHTML = `
        <a href="#overview" class="logo">
            <div class="logo-icon">${esc(D.plugin.logoText || 'AI')}</div>
            <span class="logo-text">${esc(D.plugin.namePrefix || D.plugin.name)}<span>${esc(D.plugin.nameSuffix || '')}</span></span>
        </a>
        <nav class="breadcrumb">
            <span class="sep">›</span>
            <a href="#overview">Plugin Reference</a>
            <span class="sep">›</span>
            <span>${esc(D.plugin.name)}</span>
        </nav>
        <div id="search-wrap">
            <span id="search-icon">⌕</span>
            <input id="search" type="text" placeholder="Search API… ( / )">
            <div id="search-results"></div>
        </div>`;
    }

    // ── SIDEBAR ───────────────────────────────────────────────────────────────

    function renderSidebar(D) {
        // Fixed top sections
        const fixed = `
        <div class="nav-section">
            <div class="nav-section-header">Getting Started <span class="chevron">▾</span></div>
            <ul class="nav-items">
                <li class="nav-item"><a data-anchor="overview"      href="#overview">      <span class="type-dot dot-overview"></span>Overview</a></li>
                <li class="nav-item"><a data-anchor="architecture"  href="#architecture">  <span class="type-dot dot-overview"></span>Architecture</a></li>
                <li class="nav-item"><a data-anchor="workflows"     href="#workflows">     <span class="type-dot dot-overview"></span>Workflows</a></li>
            </ul>
        </div>`;

        const groups = (D.groups || []).map(g => {
            const items = g.classes.map(id => {
                const cls = (D.classes || []).find(c => c.id === id);
                const dot = cls ? esc(cls.navDot || 'dot-object') : 'dot-object';
                const label = cls ? esc(cls.name) : esc(id);
                return `<li class="nav-item"><a data-anchor="${esc(id)}" href="#${esc(id)}"><span class="type-dot ${dot}"></span>${label}</a></li>`;
            }).join('');

            return `
            <div class="nav-section">
                <div class="nav-section-header">${esc(g.label)} <span class="chevron">▾</span></div>
                <ul class="nav-items">${items}</ul>
            </div>`;
        }).join('');

        const refSection = (D.delegatesRef && D.delegatesRef.length) ? `
        <div class="nav-section">
            <div class="nav-section-header">Reference <span class="chevron">▾</span></div>
            <ul class="nav-items">
                <li class="nav-item"><a data-anchor="delegates" href="#delegates"><span class="type-dot dot-overview"></span>Delegates</a></li>
            </ul>
        </div>` : '';

        document.getElementById('sidebar').innerHTML = fixed + groups + refSection;
    }

    // ── MAIN CONTENT ──────────────────────────────────────────────────────────

    function renderContent(D) {
        // Build a lookup map from class id → class object
        const classMap = {};
        (D.classes || []).forEach(c => { classMap[c.id] = c; });

        const parts = [
            renderOverview(D),
            renderArchitecture(D),
            renderWorkflows(D),
            ...(D.groups || []).map(g => renderGroup(g, classMap)),
        ];

        if (D.delegatesRef && D.delegatesRef.length) {
            parts.push(renderDelegatesRef(D));
        }

        document.getElementById('content').innerHTML = parts.join('');
    }

    // ── SEARCH INDEX ──────────────────────────────────────────────────────────

    function buildSearchIndex(D) {
        const index = [
            { name: 'Overview',      ctx: 'Getting Started', anchor: 'overview' },
            { name: 'Architecture',  ctx: 'Getting Started', anchor: 'architecture' },
            { name: 'Workflows',     ctx: 'Getting Started', anchor: 'workflows' },
            { name: 'Delegates',     ctx: 'Reference',       anchor: 'delegates' },
        ];

        (D.classes || []).forEach(cls => {
            index.push({ name: cls.name, ctx: cls.parents[cls.parents.length - 1] || 'Class', anchor: cls.id });

            // Index key members (functions and properties)
            (cls.body || []).forEach(group => {
                const rows = group.rows || group.delegates || [];
                rows.forEach(r => {
                    const name = r.name || (r.sig && r.sig.split('(')[0]);
                    if (name) index.push({ name, ctx: cls.name, anchor: cls.id });
                });
                (group.enums || []).forEach(e => index.push({ name: e.name, ctx: cls.name, anchor: cls.id }));
                (group.structs || []).forEach(s => index.push({ name: s.name, ctx: cls.name, anchor: cls.id }));
            });
        });

        return index;
    }

    // ── INTERACTIONS ──────────────────────────────────────────────────────────

    function initInteractions(searchIndex) {
        // Search
        const searchInput   = document.getElementById('search');
        const searchResults = document.getElementById('search-results');

        function highlight(text, q) {
            const i = text.toLowerCase().indexOf(q);
            if (i === -1) return esc(text);
            return esc(text.slice(0, i))
                + `<mark style="background:#003f6b;color:#4fc3f7;border-radius:2px">${esc(text.slice(i, i + q.length))}</mark>`
                + esc(text.slice(i + q.length));
        }

        function doSearch(q) {
            q = q.trim().toLowerCase();
            if (!q) { searchResults.classList.remove('open'); return; }
            const hits = searchIndex.filter(e =>
                e.name.toLowerCase().includes(q) || e.ctx.toLowerCase().includes(q)
            ).slice(0, 12);

            if (!hits.length) {
                searchResults.innerHTML = '<div class="sr-item"><div class="sr-ctx">No results</div></div>';
            } else {
                searchResults.innerHTML = hits.map(h => `
                    <div class="sr-item" data-anchor="${esc(h.anchor)}">
                        <div class="sr-name">${highlight(h.name, q)}</div>
                        <div class="sr-ctx">${esc(h.ctx)}</div>
                    </div>`).join('');
                searchResults.querySelectorAll('.sr-item').forEach(el => {
                    el.addEventListener('click', () => {
                        navigateTo(el.dataset.anchor);
                        searchResults.classList.remove('open');
                        searchInput.value = '';
                    });
                });
            }
            searchResults.classList.add('open');
        }

        searchInput.addEventListener('input', e => doSearch(e.target.value));
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') { searchResults.classList.remove('open'); searchInput.blur(); }
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#search-wrap')) searchResults.classList.remove('open');
        });
        document.addEventListener('keydown', e => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault(); searchInput.focus();
            }
        });

        // Navigation
        function setActiveNav(anchor) {
            document.querySelectorAll('.nav-item a').forEach(a => {
                a.classList.toggle('active', a.dataset.anchor === anchor);
            });
        }

        function navigateTo(anchor) {
            const el = document.getElementById(anchor);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            setActiveNav(anchor);
        }

        document.querySelectorAll('.nav-item a[data-anchor]').forEach(a => {
            a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.anchor); });
        });

        // Sidebar collapse
        document.querySelectorAll('.nav-section-header').forEach(h => {
            h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
        });

        // Scroll spy
        const OFFSET = 52 + 20;
        const sections = Array.from(document.querySelectorAll('.doc-section[id], .class-card[id]'));
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY + OFFSET;
                let active = null;
                for (const s of sections) { if (s.offsetTop <= y) active = s.id; else break; }
                if (active) setActiveNav(active);
                ticking = false;
            });
        }, { passive: true });
    }

    // ── ENTRY POINT ───────────────────────────────────────────────────────────

    function render() {
        const D = window.PLUGIN_DATA;
        if (!D) {
            document.getElementById('content').innerHTML =
                '<p style="color:#f47067;padding:40px">Error: window.PLUGIN_DATA is not defined. Check that your data .js file is loaded before renderer.js.</p>';
            return;
        }

        renderTopbar(D);
        renderSidebar(D);
        renderContent(D);
        initInteractions(buildSearchIndex(D));
    }

    document.addEventListener('DOMContentLoaded', render);

})();
