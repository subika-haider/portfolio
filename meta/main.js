import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let commitProgress = 100;
let filteredCommits = [];
let timeScale;
let xScale, yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  return d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
}

function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      const { author, date, time, timezone, datetime } = lines[0];
      const ret = {
        id: commit,
        url: `https://github.com/vis-society/lab-6/commit/${commit}`,
        author, date, time, timezone, datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length
      };
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false
      });
      return ret;
    })
    .sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');

  const numFiles = d3.group(data, d => d.file).size;
  const fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  const maxFileLength = d3.max(fileLengths, d => d[1]);
  const workByDay = d3.rollups(data, v => v.length, d => d.datetime.toLocaleString('en', { weekday: 'long' }));
  const busiestDay = d3.greatest(workByDay, d => d[1])?.[0];

  const stats = [
    { label: 'Commits', value: commits.length },
    { label: 'Files', value: numFiles },
    { label: 'Total LOC', value: data.length },
    { label: 'Max File Length', value: maxFileLength },
    { label: 'Busiest Day', value: busiestDay }
  ];

  container.selectAll('.stat')
    .data(stats)
    .join('div')
    .attr('class', 'stat')
    .html(d => `
      <div class="stat-label">${d.label}</div>
      <div class="stat-value">${d.value}</div>
    `);
}

function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString('en', { dateStyle: 'full' });
  document.getElementById('commit-time').textContent = commit.time;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tt = document.getElementById('commit-tooltip');
  tt.style.left = `${event.clientX + 10}px`;
  tt.style.top = `${event.clientY + 10}px`;
}

function renderScatterPlot(data, commits) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usable = {
    left: margin.left,
    top: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
    bottom: height - margin.bottom
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.left + usable.width])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usable.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usable.width));

  svg.append('g')
    .attr('transform', `translate(0,${usable.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${usable.left},0)`)
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(d3.sort(commits, d => -d.totalLines), d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, c) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(c);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart').select('svg');
  xScale.domain(d3.extent(commits, d => d.datetime));
  svg.select('g.x-axis').call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);
  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7),
      update => update.transition().duration(300)
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines)),
      exit => exit.remove()
    );
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({
      name,
      lines,
      type: lines[0]?.type || 'unknown'
    }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => enter.append('div').call(div => {
      div.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
      div.append('dd');
    }))
    .attr('style', d => `--color: ${colors(d.type)}`);

  filesContainer.select('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function onTimeSliderChange() {
  commitProgress = +document.getElementById('commit-progress').value;
  const commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  });
  filteredCommits = allCommits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(dataGlobal, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function onStepEnter(response) {
  const datetime = response.element.__data__.datetime;
  filteredCommits = allCommits.filter(d => d.datetime <= datetime);
  updateScatterPlot(dataGlobal, filteredCommits);
  updateFileDisplay(filteredCommits);
}

let allCommits, dataGlobal;

(async function main() {
  dataGlobal = await loadData();
  allCommits = processCommits(dataGlobal);
  filteredCommits = allCommits;
  renderCommitInfo(dataGlobal, allCommits);
  renderScatterPlot(dataGlobal, allCommits);

  timeScale = d3.scaleTime()
    .domain(d3.extent(allCommits, d => d.datetime))
    .range([0, 100]);

  document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);
  onTimeSliderChange();

  d3.select('#scatter-story')
    .selectAll('.step')
    .data(allCommits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full', timeStyle: 'short'
      })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
      I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
      Then I looked over all I had made, and I saw that it was very good.
    `);

  const scroller = scrollama();
  scroller.setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step'
  }).onStepEnter(onStepEnter);
})();
