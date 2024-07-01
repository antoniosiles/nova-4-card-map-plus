import axios from 'axios';
import Card from './components/Card'

Nova.booting((app, store) => {
  app.component('nova-4-card-map-plus', Card)
})
app.axios = axios;
app.$http = axios;
window.axios = axios