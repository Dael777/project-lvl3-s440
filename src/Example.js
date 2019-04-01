export default class Example {
  constructor(element) {
    this.element = element;
  }

  init() {
    this.element.textContent = 'RSS Feed';
    console.log('done!');
  }
}
