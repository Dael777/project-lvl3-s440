import '@babel/polyfill';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import axios from 'axios';

export default () => {
  const inputState = {
    valid: null,
    errorName: null,
    parseErrors: null,
    feedToAdd: null,
  };

  const activeFeedsList = [];
  const feedUrl = document.querySelector('#feed-url');
  const errorShow = feedUrl.nextElementSibling;
  const parseErrorField = document.querySelector('#parse-error');
  const addFeedForm = document.querySelector('#add-feed-form');
  const rssFeedsContainer = document.querySelector('#rss-feeds');

  watch(inputState, ['valid', 'errorName'], () => {
    feedUrl.classList.remove('is-valid', 'is-invalid');
    switch (inputState.valid) {
      case true:
        feedUrl.classList.add('is-valid');
        break;
      case false:
        feedUrl.classList.add('is-invalid');
        errorShow.textContent = inputState.errorName;
        break;
      default: break;
    }
  });

  watch(inputState, 'parseErrors', () => {
    parseErrorField.textContent = inputState.parseErrors;
  });

  watch(inputState, 'data', () => {
    if (inputState.data) {
      const row = document.createElement('div');
      row.classList.add('row');
      const col12 = document.createElement('div');
      col12.classList.add('col-12');
      const h2 = document.createElement('h2');
      h2.textContent = inputState.data.getElementsByTagName('title')[0].textContent;
      const h5 = document.createElement('h5');
      h5.textContent = inputState.data.getElementsByTagName('description')[0].textContent;
      const ul = document.createElement('ul');
      const items = inputState.data.querySelectorAll('item');
      items.forEach((item) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = item.children[0].textContent;
        a.href = item.children[3].textContent;
        li.append(a);
        ul.append(li);
      });
      col12.append(h2, h5, ul);
      row.append(col12);
      rssFeedsContainer.append(row);
    }
  });

  const inputValidate = () => {
    if (feedUrl.value.length === 0) {
      inputState.valid = null;
      return;
    }
    if (!validator.isURL(feedUrl.value)) {
      inputState.valid = false;
      inputState.errorName = 'Please enter correct URL';
      return;
    }
    if (activeFeedsList.indexOf(feedUrl.value) > -1) {
      inputState.valid = false;
      inputState.errorName = 'This feed has already been added';
      return;
    }
    inputState.valid = true;
  };
  feedUrl.addEventListener('input', inputValidate);

  const getRssFeed = (url) => {
    axios({
      method: 'get',
      url: `https://cors-anywhere.herokuapp.com/${url}`,
    })
      .then((response) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.data, 'application/xml');
        console.log(doc);
        inputState.data = doc;
        activeFeedsList.push(url);
      })
      .catch((error) => {
        inputState.parseErrors = error.message;
      });
  };

  const addFeed = (e) => {
    e.preventDefault();
    inputState.parseErrors = null;
    if (inputState.valid) {
      getRssFeed(feedUrl.value);
      feedUrl.classList.remove('is-valid', 'is-invalid');
      feedUrl.value = '';
    }
  };
  addFeedForm.addEventListener('submit', addFeed);
};
