import config from './config.json'

window.greet = () => {
  const name = document.querySelector('[name="name"]').value
  /* eslint-disable-next-line */
  fetch(config.hello, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  })
    .then((response) => response.json())
    .then(json => {
      document.querySelector('h1').innerText = json.message
    })
    .catch(console.error)
}
