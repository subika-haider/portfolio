import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line:   +row.line,
    depth:  +row.depth,
    length: +row.length,
    date:   new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const { author, date, time, timezone, datetime } = lines[0];
    const ret = {
      id: commit,
      url: `https://github.com/vis-society/lab-6/commit/${commit}`,
      author, date, time, timezone, datetime,
      hourFrac:    datetime.getHours() + datetime.getMinutes()/60,
      totalLines:  lines.length
    };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      enumerable: false,
      writable:   false,
      configurable: false
    });
    return ret;
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats')
    .append('dl')
    .attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  const numFiles = d3.group(data, d => d.file).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const maxFileLength = d3.max(fileLengths, d => d[1]);
  dl.append('dt').text('Max file length (lines)');
  dl.append('dd').text(maxFileLength);

  const workByDay = d3.rollups(
    data,
    v => v.length,
    d => d.datetime.toLocaleString('en', { weekday: 'long' })
  );
  const busiestDay = d3.greatest(workByDay, d => d[1])?.[0];
  dl.append('dt').text('Busiest day of week');
  dl.append('dd').text(busiestDay);
}

function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href       = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  document.getElementById('commit-time').textContent = commit.time;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent  = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tt = document.getElementById('commit-tooltip');
  tt.style.left = `${event.clientX + 10}px`;
  tt.style.top  = `${event.clientY + 10}px`;
}

function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const margin = { top:10, right:10, bottom:30, left:50 };
  const usable = {
    left:   margin.left,
    top:    margin.top,
    width:  width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
    bottom: height - margin.bottom
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.left + usable.width])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0,24])
    .range([usable.bottom, usable.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([2,30]);

  svg.append('g')
    .attr('class','gridlines')
    .attr('transform',`translate(${usable.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));

  svg.append('g')
    .attr('transform',`translate(0,${usable.bottom})`)
    .call(d3.axisBottom(xScale));
  svg.append('g')
    .attr('transform',`translate(${usable.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => String(d%24).padStart(2,'0') + ':00'));

  const sorted = d3.sort(commits, d => -d.totalLines);
  svg.append('g')
    .attr('class','dots')
    .selectAll('circle')
    .data(sorted)
    .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r',  d => rScale(d.totalLines))
      .attr('fill', 'steelblue')
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, c) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(c);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', event => updateTooltipPosition(event))
      .on('mouseleave', (event) => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      });

  const brush = d3.brush()
    .on('start brush end', brushed);

  svg.call(brush);

  svg.selectAll('.dots, .overlay ~ *').raise();

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0,y0],[x1,y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  }

  function renderSelectionCount(selection) {
    const countEl = document.getElementById('selection-count');
    const selected = selection
      ? commits.filter(d => isCommitSelected(selection, d))
      : [];
    countEl.textContent = `${selected.length || 'No'} commits selected`;
    return selected;
  }

  function renderLanguageBreakdown(selection) {
    const container = document.getElementById('language-breakdown');
    const sel = selection
      ? commits.filter(d => isCommitSelected(selection, d))
      : [];
    const use = sel.length ? sel : commits;
    const lines = use.flatMap(d => d.lines);
    const breakdown = d3.rollup(
      lines,
      v => v.length,
      d => d.type
    );
    container.innerHTML = '';
    for (const [lang, cnt] of breakdown) {
      const pct = d3.format('.1~%')(cnt / lines.length);
      container.innerHTML += `<dt>${lang}</dt><dd>${cnt} lines (${pct})</dd>`;
    }
  }

  function brushed(event) {
    const sel = event.selection;
    svg.selectAll('circle')
      .classed('selected', d => isCommitSelected(sel, d));
    renderSelectionCount(sel);
    renderLanguageBreakdown(sel);
  }
}

(async function main() {
  const data    = await loadData();
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
})();
