
import 'fake-indexeddb/auto';

// Add the missing toHex method for PDF.js tests
interface Uint8ArrayWithHex extends Uint8Array {
  toHex(): string;
}

const prototype = Uint8Array.prototype as Uint8ArrayWithHex;

if (typeof prototype.toHex !== 'function') {
  prototype.toHex = function (): string {
    return Array.from(this)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };
}
