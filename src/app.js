import '@babel/polyfill';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import axios from 'axios';

export default () => {
  const state = {
    inputValid: null,
    inputError: null,
    formStatus: null,
    formError: null,
    feedToAdd: null,
    activeFeedsList: [],
    feedNumber: 0,
  };
  const addFeedInput = document.querySelector('#feed-url');
  const errorShow = addFeedInput.nextElementSibling;
  const formErrorField = document.querySelector('#parse-error');
  const addFeedForm = document.querySelector('#add-feed-form');
  const rssFeedsContainer = document.querySelector('#rss-feeds');
  const formSpinner = document.querySelector('#form-spinner');

  watch(state, ['inputValid', 'inputError'], () => {
    addFeedInput.classList.remove('is-valid', 'is-invalid');
    if (state.inputValid === null) {
      return;
    }
    if (!state.inputValid) {
      addFeedInput.classList.add('is-invalid');
      errorShow.textContent = state.inputError;
      return;
    }
    addFeedInput.classList.add('is-valid');
  });

  watch(state, 'formError', () => {
    formErrorField.textContent = state.formError;
  });

  watch(state, 'feedToAdd', () => {
    const items = state.feedToAdd.querySelectorAll('item');
    const itemsList = [...items].map((item, index) => `<li>
      <a href="${item.children[2].textContent}" data-toggle="modal" data-target="#item-${state.feedNumber}-${index}">${item.children[0].textContent}</a>
      <div class="modal fade" id="item-${state.feedNumber}-${index}" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="exampleModalLabel">Article description</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">${item.children[1].textContent}</div>
         </div>
        </div>
      </div>
      </li>`).join('');
    const row = document.createElement('div');
    row.classList.add('row');
    row.innerHTML = `
      <div class="col-12">
        <h2>${state.feedToAdd.getElementsByTagName('title')[0].textContent}</h2>
        <h5>${state.feedToAdd.getElementsByTagName('description')[0].textContent}</h5>
        <ul>${itemsList}</ul>
      </div>
    `;
    rssFeedsContainer.append(row);
  });

  watch(state, 'formStatus', () => {
    if (!state.formStatus) {
      formSpinner.classList.add('d-none');
      return;
    }
    formSpinner.classList.remove('d-none');
  });

  const parse = ({ data }) => {
    const parser = new DOMParser();
    return parser.parseFromString(data, 'application/xml');
  };

  const inputValidate = () => {
    if (addFeedInput.value.length === 0) {
      state.inputValid = null;
      return;
    }
    if (!validator.isURL(addFeedInput.value)) {
      state.inputValid = false;
      state.inputError = 'Please enter correct URL';
      return;
    }
    if (state.activeFeedsList.indexOf(addFeedInput.value) > -1) {
      state.inputValid = false;
      state.inputError = 'This feed has already been added';
      return;
    }
    state.inputValid = true;
  };
  addFeedInput.addEventListener('input', inputValidate);

  const getRssFeed = (url) => {
    state.formStatus = 'pending';
    axios({
      method: 'get',
      url: `https://cors-anywhere.herokuapp.com/${url}`,
    })
      .then((response) => {
        state.formStatus = null;
        const doc = parse(response);
        if (doc.documentElement.tagName !== 'rss') {
          state.formError = 'There is no RSS channel on this address';
          return;
        }
        state.inputValid = null;
        state.feedNumber += 1;
        addFeedInput.value = '';
        state.feedToAdd = doc;
        state.activeFeedsList.push(url);
      })
      .catch((error) => {
        state.formStatus = null;
        state.formError = error.message;
      });
  };

  const addFeed = (e) => {
    e.preventDefault();
    state.formError = null;
    if (state.inputValid) {
      getRssFeed(addFeedInput.value);
    }
  };
  addFeedForm.addEventListener('submit', addFeed);
};
