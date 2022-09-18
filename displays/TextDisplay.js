class TextDisplay {
  constructor(parent, level) {
    this.status = elt('div', { class: 'tstatus' });
    this.actors = elt('table', { class: 'tactors' });
    this.dom = elt('div', { class: 'tgame' }, this.status, this.actors);
    parent.appendChild(this.dom);
  }

  clear() {}

  syncState(state) {
    this.status.innerHTML = `STATUS: ${state.status}`;
    var s = '<tr><th>type</th><th>pos</th><th>speed</th></tr>';
    for (var a of state.actors)
      s += `<tr><td>${a.type}</td><td>${a.pos}</td><td>${a.speed}</td></tr>`;
    this.actors.innerHTML = s;
  }
}
