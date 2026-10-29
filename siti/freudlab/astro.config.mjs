import { configuraSito } from '../../condiviso/configura-sito.mjs';

export default configuraSito({
  sigla: 'freudlab',
  dominio: 'freudlab.it',
  cartellaSito: new URL('./', import.meta.url),
});
