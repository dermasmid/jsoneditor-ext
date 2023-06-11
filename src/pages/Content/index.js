import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';


function ready() {
    const plainText = getTextFromTextOnlyDocument();
    if (!plainText) return

    try {
        const strippedText = plainText.substring(firstJSONCharIndex(plainText));

        const obj = JSON.parse(strippedText);
        const container = document.createElement("div")
        container.setAttribute('ext-id', chrome.runtime.id)
        container.style.height = "98vh"
    
        const options = {}
        const editor = new JSONEditor(container, options)
    
        editor.set(obj)
        let pre = document.querySelector('body > pre');
        if (pre) pre.hidden = true;
        document.body.appendChild(container);

    } catch {
        return
    }
}

function getTextFromTextOnlyDocument() {
    const bodyChildren = document.body.childNodes;
    const firstChild = bodyChildren[0];

    const bodyHasOnlyOneElement = [...document.body.childNodes].filter(n => !n.getAttribute?.('ext-id')).length === 1;
    const isPre = isPreElement(firstChild);
    const isPlainText = isPlainTextElement(firstChild);

    if (bodyHasOnlyOneElement && (isPre || isPlainText)) {
        return firstChild.innerText || firstChild.nodeValue;
    }
}

function isPreElement(element) {
    return element.tagName === 'PRE';
}


function isPlainTextElement(element) {
    return element.nodeType === Node.TEXT_NODE;
}



function firstJSONCharIndex(str) {
    const arrayIndex = str.indexOf('[');
    const objIndex = str.indexOf('{');
    let index = 0;
  
    if (arrayIndex !== -1) {
      index = arrayIndex;
    }
  
    if (objIndex !== -1) {
      if (arrayIndex === -1) {
        index = objIndex;
      } else {
        index = Math.min(objIndex, arrayIndex);
      }
    }
  
    return index;
}

ready()
