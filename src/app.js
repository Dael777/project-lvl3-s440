import '@babel/polyfill';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { watch } from 'melanke-watchjs';
import validator from 'validator';
import axios from 'axios';
import i18next from 'i18next';
import $ from 'jquery';
import _ from 'lodash';
import corsProxy from './corsproxy';

export default () => {
  i18next.init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          incorrectUrl: 'Please enter correct URL',
          doubledUrl: 'This feed has already been added',
          noRss: 'There is no RSS channel on this address',
        },
      },
    },
  });

  const state = {
    newFeedUrl: null,
    newFeed: {},
    updatedFeedUrl: null,
    updatedFeedArticles: null,
    formStatus: 'resting',
    addedFeeds: [],
    error: null,
    modal: null,
  };

  const addFeedInput = document.querySelector('#feed-url');
  const errorShow = addFeedInput.nextElementSibling;
  const addFeedForm = document.querySelector('#add-feed-form');
  const rssFeedsContainer = document.querySelector('#rss-feeds');
  const formSpinner = document.querySelector('#form-spinner');
  const btnSubmit = document.querySelector('#btn-submit');
  const modalBody = document.querySelector('#modal-body');

  const parseRss = (data) => {
    const parser = new DOMParser();
    const rss = parser.parseFromString(data, 'application/xml');
    if (rss.documentElement.tagName !== 'rss') {
      return false;
    }
    const feedTitle = rss.querySelector('title').textContent;
    const feedDescription = rss.querySelector('description').textContent;
    const getFeedArticles = rss.querySelectorAll('item');
    const feedArticles = [...getFeedArticles].map((getFeedArticle) => {
      const articleTitle = getFeedArticle.children[0].textContent;
      const articleDescription = getFeedArticle.children[1].textContent;
      const articleLink = getFeedArticle.children[2].textContent;
      const articleId = getFeedArticle.children[3].textContent;
      const feedArticle = {
        id: articleId,
        title: articleTitle,
        description: articleDescription,
        link: articleLink,
      };
      return feedArticle;
    });
    return {
      feedTitle,
      feedDescription,
      feedArticles,
    };
  };

  const createHtmlItems = items => items.map(
    item => `<li class="mb-1">
      <a href="${item.link}">${item.title}</a>
      <button type="button" class="btn btn-info" data-target="#exampleModal" data-id="${item.id}" data-toggle="modal">Description</button>
      </li>`,
  ).join('');

  const updateArticles = (feedUrl) => {
    setTimeout(() => {
      axios.get(`${corsProxy}${feedUrl}`)
        .then((response) => {
          const updatedFeed = parseRss(response.data);
          state.updatedFeedUrl = feedUrl;
          state.updatedFeedArticles = updatedFeed.feedArticles;
        })
        .finally(() => {
          updateArticles(feedUrl);
        });
    }, 2000);
  };

  const showError = (errorKey) => {
    addFeedInput.classList.add('is-invalid');
    errorShow.textContent = i18next.t(errorKey);
  };

  watch(state, 'error', () => {
    addFeedInput.classList.remove('is-valid', 'is-invalid');
    if (state.error === null) {
      addFeedInput.value = '';
      return;
    }
    if (state.error === 'valid') {
      addFeedInput.classList.add('is-valid');
      return;
    }
    showError(state.error);
    addFeedInput.classList.add('is-invalid');
  });

  watch(state, 'formStatus', () => {
    if (state.formStatus === 'resting') {
      formSpinner.classList.add('d-none');
      btnSubmit.removeAttribute('disabled');
      return;
    }
    btnSubmit.setAttribute('disabled', '');
    formSpinner.classList.remove('d-none');
  });

  watch(state, 'newFeedUrl', () => {
    const articlesToAdd = createHtmlItems(state.newFeed.articles);
    const row = document.createElement('div');
    row.classList.add('row');
    row.setAttribute('data-feed', state.newFeedUrl);
    row.innerHTML = `
      <div class="col-12">
        <h2>${state.newFeed.title}</h2>
        <h5>${state.newFeed.description}</h5>
        <ul>${articlesToAdd}</ul>
      </div>
    `;
    rssFeedsContainer.append(row);
    updateArticles(state.newFeedUrl);
  });

  watch(state, 'updatedFeedArticles', () => {
    const updatedFeed = document.querySelector(`[data-feed="${state.updatedFeedUrl}"]`);
    const currentArticles = updatedFeed.querySelectorAll('li a');
    const currentLinks = [...currentArticles].map(currentArticle => currentArticle.href);
    const newArticles = _.filter(state.updatedFeedArticles,
      article => !currentLinks.includes(article.link));
    if (newArticles.length > 0) {
      state.addedFeeds = state.addedFeeds.concat(newArticles);
    }
    const currentUl = updatedFeed.querySelector('ul');
    const newItems = createHtmlItems(newArticles);
    currentUl.insertAdjacentHTML('beforeEnd', newItems);
  });

  watch(state, 'modal', () => {
    const currentArticleDescription = state.addedFeeds.find(el => el.id === state.modal);
    $(modalBody).text(currentArticleDescription.description);
  });

  const inputValidate = () => {
    if (addFeedInput.value.length === 0) {
      state.error = null;
      return;
    }
    if (!validator.isURL(addFeedInput.value)) {
      state.error = 'incorrectUrl';
      return;
    }
    if (state.addedFeeds.indexOf(addFeedInput.value) > -1) {
      state.error = 'doubledUrl';
      return;
    }
    state.error = 'valid';
  };
  addFeedInput.addEventListener('input', inputValidate);

  const addNewFeed = (e) => {
    e.preventDefault();
    if (!state.error) {
      return;
    }
    const url = addFeedInput.value;
    state.formStatus = 'pending';
    axios.get(`${corsProxy}${url}`)
      .then((response) => {
        state.formStatus = 'resting';
        const newFeed = parseRss(response.data);
        if (!newFeed) {
          state.error = 'noRss';
          return;
        }
        state.newFeedUrl = url;
        state.newFeed = {
          title: newFeed.feedTitle,
          description: newFeed.feedDescription,
          articles: newFeed.feedArticles,
        };
        state.error = null;
        state.addedFeeds = state.addedFeeds.concat(newFeed.feedArticles);
      })
      .catch((error) => {
        state.formStatus = 'resting';
        state.error = error.message;
      });
  };
  addFeedForm.addEventListener('submit', addNewFeed);

  $(document).on('show.bs.modal', '.modal', (e) => {
    const currentArticleId = $(e.relatedTarget).attr('data-id');
    state.modal = currentArticleId;
  });
};
