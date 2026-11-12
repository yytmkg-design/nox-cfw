import {createApp} from '../lib/app.mjs';
import {redis} from '../lib/redis.mjs';
export default {fetch:createApp({redis})};
