import { configuraSito } from '../../condiviso/configura-sito.mjs';

export default configuraSito({
  sigla: 'ali-milano',
  dominio: 'ali-milano.it',
  cartellaSito: new URL('./', import.meta.url),
});
