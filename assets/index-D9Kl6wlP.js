function Pe(c,i){for(var o=0;o<i.length;o++){const u=i[o];if(typeof u!="string"&&!Array.isArray(u)){for(const s in u)if(s!=="default"&&!(s in c)){const t=Object.getOwnPropertyDescriptor(u,s);t&&Object.defineProperty(c,s,t.get?t:{enumerable:!0,get:()=>u[s]})}}}return Object.freeze(Object.defineProperty(c,Symbol.toStringTag,{value:"Module"}))}var U={},C={},V;function be(){if(V)return C;V=1,Object.defineProperty(C,"__esModule",{value:!0}),C.LocalStorage=void 0;class c{async get(o){return typeof window>"u"?null:localStorage.getItem(o)}async set(o,u){typeof window>"u"||localStorage.setItem(o,u)}async remove(o){typeof window>"u"||localStorage.removeItem(o)}}return C.LocalStorage=c,C}var P={},_={},L={},Y;function _e(){if(Y)return L;Y=1,Object.defineProperty(L,"__esModule",{value:!0}),L.encodeBase58=i;const c="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";function i(o){if(o.length===0)return"";let u=0,s=0;for(;s<o.length&&o[s]===0;)u++,s++;let t=[0];for(;s<o.length;s++){let n=o[s];for(let d=0;d<t.length;++d)n+=t[d]<<8,t[d]=n%58,n=n/58|0;for(;n>0;)t.push(n%58),n=n/58|0}for(;t.length>0&&t[t.length-1]===0;)t.pop();let e="";for(let n=0;n<u;n++)e+=c[0];for(let n=t.length-1;n>=0;--n)e+=c[t[n]];return e}return L}var X;function R(){if(X)return _;X=1,Object.defineProperty(_,"__esModule",{value:!0}),_.nearActionsToConnectorActions=void 0;const c=_e(),i=t=>{try{return JSON.parse(new TextDecoder().decode(t))}catch{return t}},o=t=>t.enum!=null?t.enum==="fullAccess":"fullAccess"in t,u=t=>t.enum!=null?t.enum==="AccountId":"AccountId"in t,s=t=>t.map(e=>{if("type"in e)return e;if(e.signedDelegate)throw new Error("SignedDelegate actions cannot be sent through the wallet connector; wallets sign delegates via signDelegateActions");if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:i(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:u(e.deployGlobalContract.deployMode)?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract){const n=e.useGlobalContract.contractIdentifier;return{type:"UseGlobalContract",params:{contractIdentifier:n.AccountId!=null?{accountId:n.AccountId}:{codeHash:(0,c.encodeBase58)(n.CodeHash)}}}}if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey){const{permission:n}=e.addKey.accessKey;let d;if(n.functionCall)d={receiverId:n.functionCall.receiverId,allowance:n.functionCall.allowance?.toString(),methodNames:n.functionCall.methodNames};else if(o(n))d="FullAccess";else throw new Error("Unsupported access-key permission on AddKey: only functionCall and fullAccess can be sent through the wallet connector (pass a ConnectorAction otherwise)");return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:d}}}}throw new Error("Unsupported action type")});return _.nearActionsToConnectorActions=s,_}var B={},Z;function G(){return Z||(Z=1,(function(c){Object.defineProperty(c,"__esModule",{value:!0}),c.isGasKeyAction=void 0,c.assertGasKeyActionsSupported=o;const i=u=>u.type==="TransferToGasKey"||u.type==="WithdrawFromGasKey"||u.type==="AddKey"&&u.params.gasKeyInfo!=null;c.isGasKeyAction=i;function o(u,s,t){if(u?.gasKeys)return;const e=s.filter(c.isGasKeyAction).map(n=>n.type);if(e.length!==0)throw new Error(`${t} does not advertise gas-key support (manifest features.gasKeys), so ${[...new Set(e)].join(", ")} cannot be sent through it; a wallet that does not know gasKeyInfo could add a plain key instead. Sign locally with a full-access key, or use a wallet whose manifest sets features.gasKeys.`)}})(B)),B}var I={},Q;function z(){if(Q)return I;Q=1,Object.defineProperty(I,"__esModule",{value:!0}),I.uuid4=void 0;const c=()=>typeof window<"u"&&typeof window.crypto<"u"&&typeof window.crypto.randomUUID=="function"?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(i){const o=Math.random()*16|0;return(i==="x"?o:o&3|8).toString(16)});return I.uuid4=c,I}var ee;function ve(){if(ee)return P;ee=1,Object.defineProperty(P,"__esModule",{value:!0}),P.ParentFrameWallet=void 0;const c=R(),i=G(),o=z();let u=class{connector;manifest;constructor(t,e){this.connector=t,this.manifest=e}callParentFrame(t,e){const n=(0,o.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:n,method:t,params:e},"*"),new Promise((d,h)=>{const l=g=>{g.data.type==="near-wallet-injected-response"&&g.data.id===n&&(window.removeEventListener("message",l),g.data.success?d(g.data.result):h(g.data.error))};window.addEventListener("message",l)})}async signIn(t){const e=await this.callParentFrame("near:signIn",{network:t?.network??this.connector.network,addFunctionCallKey:t?.addFunctionCallKey});return Array.isArray(e)?e:[e]}async signInAndSignMessage(t){const e=await this.callParentFrame("near:signInAndSignMessage",{network:t?.network??this.connector.network,addFunctionCallKey:t?.addFunctionCallKey,messageParams:t.messageParams});return Array.isArray(e)?e:[e]}async signOut(t){const e={...t,network:t?.network??this.connector.network};await this.callParentFrame("near:signOut",e)}async getAccounts(t){const e={...t,network:t?.network??this.connector.network};return this.callParentFrame("near:getAccounts",e)}async signAndSendTransaction(t){const e=(0,c.nearActionsToConnectorActions)(t.actions);(0,i.assertGasKeyActionsSupported)(this.manifest.features,e,this.manifest.name);const n={...t,actions:e,network:t.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",n)}async signAndSendTransactions(t){const e=t.transactions.map(d=>({actions:(0,c.nearActionsToConnectorActions)(d.actions),receiverId:d.receiverId}));(0,i.assertGasKeyActionsSupported)(this.manifest.features,e.flatMap(d=>d.actions),this.manifest.name);const n={...t,transactions:e,network:t.network??this.connector.network};return this.callParentFrame("near:signAndSendTransactions",n)}async signMessage(t){const e={...t,network:t.network??this.connector.network};return this.callParentFrame("near:signMessage",e)}async signDelegateActions(t){const e={...t,delegateActions:t.delegateActions.map(n=>({...n,actions:(0,c.nearActionsToConnectorActions)(n.actions)})),network:t.network||this.connector.network};return(0,i.assertGasKeyActionsSupported)(this.manifest.features,e.delegateActions.flatMap(n=>n.actions),this.manifest.name),this.callParentFrame("near:signDelegateActions",e)}};return P.ParentFrameWallet=u,P}var v={},k={},E={},te;function xe(){if(te)return E;te=1,Object.defineProperty(E,"__esModule",{value:!0}),E.parseUrl=void 0;const c=i=>{try{return new URL(i)}catch{return null}};return E.parseUrl=c,E}var M={},ne;function Ie(){if(ne)return M;ne=1,Object.defineProperty(M,"__esModule",{value:!0}),M.copyText=void 0;const c=async i=>{try{await navigator.clipboard.writeText(i);return}catch{}const o=document.createElement("textarea");o.value=i,o.setAttribute("readonly",""),o.style.position="fixed",o.style.opacity="0",document.body.appendChild(o),o.select();try{if(!document.execCommand("copy"))throw new Error("Copy failed")}finally{o.remove()}};return M.copyText=c,M}var b={},re;function Ee(){if(re)return b;re=1,Object.defineProperty(b,"__esModule",{value:!0}),b.openExternalLink=b.openTelegramLink=b.isTelegramMiniApp=void 0;const c=()=>{const e=window?.Telegram?.WebApp;return!e||!e.platform||e.platform==="unknown"?null:e},i=()=>{try{return location.hash.includes("tgWebAppData")?!0:!!sessionStorage.getItem("__telegram__initParams")}catch{return!1}},o=()=>typeof window>"u"?!1:!!c()||!!window.TelegramWebviewProxy||i();b.isTelegramMiniApp=o;const u=(e,n)=>{const d=window.TelegramWebviewProxy;if(d?.postEvent)return d.postEvent(e,JSON.stringify(n));const h=window.external;if(h&&"notify"in h)return h.notify(JSON.stringify({eventType:e,eventData:n}));window.parent!==window&&window.parent.postMessage(JSON.stringify({eventType:e,eventData:n}),"https://web.telegram.org")},s=e=>{const n=c();if(n)return n.openTelegramLink(e.toString());u("web_app_open_tg_link",{path_full:e.pathname+e.search})};b.openTelegramLink=s;const t=e=>{const n=c();if(n)return n.openLink(e.toString());u("web_app_open_link",{url:e.toString()})};return b.openExternalLink=t,b}var A={},W={},oe;function ke(){if(oe)return W;oe=1,Object.defineProperty(W,"__esModule",{value:!0}),W.EventEmitter=void 0;class c{events={};on(o,u){this.events[o]||(this.events[o]=[]),this.events[o].push(u)}emit(o,u){this.events[o]?.forEach(s=>s(u))}off(o,u){this.events[o]=this.events[o]?.filter(s=>s!==u)}once(o,u){const s=t=>{u(t),this.off(o,s)};this.on(o,s)}removeAllListeners(o){o?delete this.events[o]:this.events={}}}return W.EventEmitter=c,W}var $={},N={},se;function H(){if(se)return N;se=1,Object.defineProperty(N,"__esModule",{value:!0}),N.escapeHtml=c,N.html=o;function c(u){return u.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}const i=Symbol("htmlTag");function o(u,...s){let t=u[0];for(let e=0;e<s.length;e++){for(const n of Array.isArray(s[e])?s[e]:[s[e]]){const d=n?.[i]?n[i]:c(String(n??""));t+=d}t+=u[e+1]}return Object.freeze({[i]:t,get html(){return t}})}return N}var j={},O={},ae;function Me(){if(ae)return O;ae=1,Object.defineProperty(O,"__esModule",{value:!0}),O.css=void 0;const c=i=>`
${i} * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -ms-overflow-style: none; 
  scrollbar-width: none; 
  color: #fff;
}

${i} *::-webkit-scrollbar { 
  display: none;
}

${i} p,
${i} h1,
${i} h2,
${i} h3,
${i} h4,
${i} h5,
${i} h6 {
  margin: 0;
}

${i} .modal-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100000000;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    transition: opacity 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${i} .modal-container {
    justify-content: flex-end;
  }
}

${i} .modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;

  max-width: 420px;
  max-height: 615px;
  width: 100%;
  border-radius: 24px;
  background: #0d0d0d;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${i} .modal-content {
    max-width: 100%;
    width: 100%;
    max-height: 80%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: none;
    border-top: 1.5px solid rgba(255, 255, 255, 0.1);
  }
}


${i} .modal-header {
  display: flex;
  padding: 16px;
  gap: 16px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  position: relative;
}

${i} .modal-header button {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

${i} .modal-header button:hover {
  background: rgba(255, 255, 255, 0.04);
}
  
${i} .modal-header p {
  color: #fff;
  text-align: center;
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  margin: 0;
}


${i} .modal-body {
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  text-align: center;
  gap: 8px;
  overflow: auto;

  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
  width: 100%;
  flex: 1;
}

${i} .modal-body textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #0d0d0d;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  outline: none;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  font-family: monospace;
  font-size: 12px;
}

${i} .modal-body button {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  color: #000;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  margin-top: 16px;
}

${i} .footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 24px;
  color: #fff;
  gap: 12px;
}

${i} .modal-body p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.8px;
}

${i} .footer img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

${i} .get-wallet-link {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: auto;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
}
  
${i} .get-wallet-link:hover {
  color: rgba(255, 255, 255, 1);
}


${i} .connect-item {
  display: flex;
  padding: 8px;
  align-items: center;
  gap: 12px;
  align-self: stretch;
  cursor: pointer;

  transition: background 0.2s ease-in-out;
  border-radius: 24px;
}

${i} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

${i} .connect-item-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  flex: 1;
  margin-top: -2px;
}

${i} .connect-item-info .wallet-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

${i} .connect-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

${i} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
}

${i} .connect-item p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  letter-spacing: -0.36px;
  margin: 0;
}
`;return O.css=c,O}var ie;function Ae(){if(ie)return j;ie=1,Object.defineProperty(j,"__esModule",{value:!0}),j.Popup=void 0;const c=Me(),i=H(),o=`n${Math.random().toString(36).substring(2,15)}`;if(typeof document<"u"){const s=document.createElement("style");s.textContent=(0,c.css)(`.${o}`),document.head.append(s)}let u=class{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(t){this.delegate=t}get dom(){return(0,i.html)``}disposables=[];addListener(t,e,n){const d=typeof t=="string"?this.root.querySelector(t):t;d&&(d.addEventListener(e,n),this.disposables.push(()=>d.removeEventListener(e,n)))}handlers(){this.disposables.forEach(d=>d()),this.disposables=[];const t=this.root.querySelector(".modal-container"),e=this.root.querySelector(".modal-content");e.onclick=d=>d.stopPropagation(),t.onclick=()=>{this.delegate.onReject(),this.destroy()};const n=d=>{d.key==="Escape"&&(this.delegate.onReject(),this.destroy())};document.addEventListener("keydown",n),this.disposables.push(()=>document.removeEventListener("keydown",n))}update(t){this.state={...this.state,...t},this.root.innerHTML=this.dom.html,this.handlers()}create({show:t=!0}){this.root.className=`${o} hot-connector-popup`,this.root.style.display="none",this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();const e=this.root.querySelector(".modal-container"),n=this.root.querySelector(".modal-content");n.style.transform="translateY(50px)",e.style.opacity="0",t&&setTimeout(()=>this.show(),10)}show(){const t=this.root.querySelector(".modal-container"),e=this.root.querySelector(".modal-content");e.style.transform="translateY(50px)",t.style.opacity="0",this.root.style.display="block",setTimeout(()=>{e.style.transform="translateY(0)",t.style.opacity="1"},100)}hide(){const t=this.root.querySelector(".modal-container"),e=this.root.querySelector(".modal-content");e.style.transform="translateY(50px)",t.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.disposables.forEach(t=>t()),this.disposables=[],this.hide(),setTimeout(()=>{this.root.remove()},200))}};return j.Popup=u,j}var le;function We(){if(le)return $;le=1,Object.defineProperty($,"__esModule",{value:!0}),$.IframeWalletPopup=void 0;const c=H(),i=Ae();let o=class extends i.Popup{delegate;constructor(s){super(s),this.delegate=s}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";const{icon:s,heading:t}=this.delegate.footer;return(0,c.html)`
      <div class="footer">
        ${s?(0,c.html)`<img src="${s}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,c.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}};return $.IframeWalletPopup=o,$}var D={},T={},ce;function $e(){return ce||(ce=1,Object.defineProperty(T,"__esModule",{value:!0}),T.NEAR_CONNECT_VERSION=void 0,T.NEAR_CONNECT_VERSION="0.12.0"),T}var de;function Ne(){if(de)return D;de=1,Object.defineProperty(D,"__esModule",{value:!0});const c=$e();async function i(o){const u=await o.executor.getAllStorage(),s=o.executor.connector.providers,t=o.executor.manifest,e=o.id,n=o.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open"),d=o.cspNonce?` nonce="${o.cspNonce.replace(/[^A-Za-z0-9+/=]/g,"")}"`:"";return`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>

      <style>
        :root {
          --background-color: rgb(40, 40, 40);
          --text-color: rgb(255, 255, 255);
          --border-color: rgb(209, 209, 209);
        }

        * {
          font-family: system-ui, Avenir, Helvetica, Arial, sans-serif
        }

        body, html {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          background-color: var(--background-color);
          color: var(--text-color);
        }

        #root {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at center, #2c2c2c 0%, #1a1a1a 100%);
          text-align: center;
        }

        #root * {
          box-sizing: border-box;
          font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color-scheme: light dark;
          color: rgb(255, 255, 255);
          font-synthesis: none;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .prompt-container img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 12px;
        }

        .prompt-container h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          margin-top: 16px;
        }

        .prompt-container p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: rgb(209, 209, 209);
        }

        .prompt-container button {
          background-color: #131313;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          cursor: pointer;
          transition: border-color 0.25s;
          color: #fff;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          margin-top: 16px;
        }
      </style>


      <script${d}>
      window.sandboxedLocalStorage = (() => {
        let storage = ${JSON.stringify(u)}

        return {
          setItem: function(key, value) {
            window.selector.storage.set(key, value)
            storage[key] = value || '';
          },
          getItem: function(key) {
            return key in storage ? storage[key] : null;
          },
          removeItem: function(key) {
            window.selector.storage.remove(key)
            delete storage[key];
          },
          get length() {
            return Object.keys(storage).length;
          },
          key: function(i) {
            const keys = Object.keys(storage);
            return keys[i] || null;
          },
        };
      })();

      const showPrompt = async (args) => {
        const root = document.getElementById("root");   
        root.style.display = "flex";
        root.innerHTML = \`
          <div class="prompt-container">
            <img src="${t.icon}" />
            <h1>${t.name}</h1>
            <p>\${args.title}</p>
            <button>\${args.button}</button>
          </div>
        \`;

        return new Promise((resolve) => {
          root.querySelector("button")?.addEventListener("click", () => {
            root.innerHTML = "";
            resolve(true);
          });
        });
      }

      class ProxyWindow {
        constructor(url, features) {
          this.closed = false;
          this.windowIdPromise = window.selector.call("open", { url, features });

          window.addEventListener("message", async (event) => {            
            if (event.data.origin !== "${e}") return;
            if (!event.data.method?.startsWith("proxy-window:")) return;
            const method = event.data.method.replace("proxy-window:", "");
            if (method === "closed" && event.data.windowId === await this.id()) this.closed = true;
          });
        } 

        async id() {
          return await this.windowIdPromise;
        }

        async focus() {
          await window.selector.call("panel.focus", { windowId: await this.id() });
        }

        async postMessage(data) {
          window.selector.call("panel.postMessage", { windowId: await this.id(), data });
        }

        async close() {
          await window.selector.call("panel.close", { windowId: await this.id() });
        }
      }

      window.selector = {
        wallet: null,
        location: "${window.location.href}",
        nearConnectVersion: "${c.NEAR_CONNECT_VERSION}",
        
        outerHeight: ${window.outerHeight},
        screenY: ${window.screenY},
        outerWidth: ${window.outerWidth},
        screenX: ${window.screenX},

        providers: {
          mainnet: ${JSON.stringify(s.mainnet)},
          testnet: ${JSON.stringify(s.testnet)},
        },

        uuid() {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        },

        walletConnect: {
          connect(params) {
            return window.selector.call("walletConnect.connect", params);
          },
          disconnect(params) {
            return window.selector.call("walletConnect.disconnect", params);
          },
          request(params) {
            return window.selector.call("walletConnect.request", params);
          },
          getProjectId() {
            return window.selector.call("walletConnect.getProjectId", {});
          },
          getSession() {
            return window.selector.call("walletConnect.getSession", {});
          },
        },
      
        async ready(wallet) {
          wallet.manifest = ${JSON.stringify(t)};
          window.parent.postMessage({ method: "wallet-ready", origin: "${e}" }, "*");
          window.selector.wallet = wallet;
        },

        async call(method, params) {
          const id = window.selector.uuid();
          window.parent.postMessage({ method, params, id, origin: "${e}" }, "*");

          return new Promise((resolve, reject) => {
            const handler = (event) => {
              if (event.data.id !== id || event.data.origin !== "${e}") return;
              window.removeEventListener("message", handler);

              if (event.data.status === "failed") reject(event.data.result);
              else resolve(event.data.result);
            };

            window.addEventListener("message", handler);
          });
        },

        panelClosed(windowId) {
          window.parent.postMessage({ 
            method: "panel.closed", 
            origin: "${e}", 
            result: { windowId } 
          }, "*");
        },

        open(url, _, params) {
          return new ProxyWindow(url, params)
        },

        external(entity, key, ...args) {
          return window.selector.call("external", { entity, key, args: args || [] });
        },

        openNativeApp(url) {
          return window.selector.call("open.nativeApp", { url });
        },

        ui: {
          async whenApprove(options) {
            window.selector.ui.showIframe();
            await showPrompt(options);
            window.selector.ui.hideIframe();
          },

          async showIframe() {
            return await window.selector.call("ui.showIframe");
          },

          async hideIframe() {
            return await window.selector.call("ui.hideIframe");
          },
        },

        storage: {
          async set(key, value) {
            await window.selector.call("storage.set", { key, value });
          },
      
          async get(key) {
            return await window.selector.call("storage.get", { key });
          },
      
          async remove(key) {
            await window.selector.call("storage.remove", { key });
          },

          async keys() {
            return await window.selector.call("storage.keys", {});
          },
        },
      };

      // Clipboard API often rejects inside the sandbox (Android WebView), copy through the dApp page then.
      // Plain assignment to navigator.clipboard is a no-op (getter on the prototype), so redefine the method
      const clipboard = navigator.clipboard || {};
      const nativeWriteText = clipboard.writeText ? clipboard.writeText.bind(clipboard) : null;
      Object.defineProperty(clipboard, "writeText", {
        configurable: true,
        value: async (text) => {
          try {
            if (nativeWriteText) return await nativeWriteText(text);
          } catch {}
          await window.selector.call("clipboard.writeText", { text });
        },
      });
      if (!navigator.clipboard) Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });

      window.addEventListener("message", async (event) => {
        if (event.data.origin !== "${e}") return;
        if (!event.data.method?.startsWith("wallet:")) return;
      
        const wallet = window.selector.wallet;
        const method = event.data.method.replace("wallet:", "");
        const payload = { id: event.data.id, origin: "${e}", method };
      
        if (wallet == null || typeof wallet[method] !== "function") {
          const data = { ...payload, status: "failed", result: "Method not found" };
          window.parent.postMessage(data, "*");
          return;
        }
        
        try {
          const result = await wallet[method](event.data.params);
          window.parent.postMessage({ ...payload, status: "success", result }, "*");
        } catch (error) {
          const data = { ...payload, status: "failed", result: error };
          window.parent.postMessage(data, "*");
        }
      });
      <\/script>

      <script type="module"${d}>${n}<\/script>
    </body>
  </html>
    `}return D.default=i,D}var ue;function je(){if(ue)return A;ue=1;var c=A&&A.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(A,"__esModule",{value:!0});const i=ke(),o=z(),u=We(),s=c(Ne());class t{executor;origin;disposed=!1;iframe=document.createElement("iframe");events=new i.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(n=>{this.readyPromiseResolve=n});constructor(n,d,h,l){this.executor=n,this.origin=(0,o.uuid4)(),this.handler=a=>{a.data.origin===this.origin&&(a.data.method==="wallet-ready"&&this.readyPromiseResolve(),h(this,a))},window.addEventListener("message",this.handler);const g=[];this.executor.checkPermissions("usb")&&g.push("usb *;"),this.executor.checkPermissions("hid")&&g.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&g.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&g.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&g.push("bluetooth *;"),this.iframe.allow=g.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,s.default)({id:this.origin,executor:this.executor,code:d,cspNonce:l}).then(a=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=a}),this.popup=new u.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{this.disposed=!0,window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(n,d){this.events.on(n,d)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(n){if(this.disposed)return;const d=this.iframe.contentWindow;if(!d)throw new Error(`Iframe not loaded for ${n?.method??"unknown method"}`);d.postMessage({...n,origin:this.origin},"*")}dispose(){this.disposed=!0,window.removeEventListener("message",this.handler),this.popup.destroy()}}return A.default=t,A}var he;function Oe(){if(he)return k;he=1;var c=k&&k.__importDefault||function(d){return d&&d.__esModule?d:{default:d}};Object.defineProperty(k,"__esModule",{value:!0});const i=xe(),o=z(),u=Ie(),s=Ee(),t=c(je()),e=(0,o.uuid4)();class n{connector;manifest;activePanels={};storageSpace;constructor(h,l){this.connector=h,this.manifest=l,this.storageSpace=l.id}checkPermissions(h,l){if(h==="walletConnect")return!!this.manifest.permissions.walletConnect;if(h==="external"){const g=this.manifest.permissions.external;return!g||!l?.entity?!1:g.includes(l.entity)}if(h==="allowsOpen"){const g=(0,i.parseUrl)(l?.url||""),a=this.manifest.permissions.allowsOpen;return!g||!a||!Array.isArray(a)||a.length===0?!1:a.some(w=>{const f=(0,i.parseUrl)(w);return!(!f||g.protocol!==f.protocol||f.hostname&&g.hostname!==f.hostname||f.pathname&&f.pathname!=="/"&&g.pathname!==f.pathname)})}return this.manifest.permissions[h]}assertPermissions(h,l,g){if(!this.checkPermissions(l,g.data.params))throw h.postMessage({...g.data,status:"failed",result:"Permission denied"}),new Error("Permission denied")}_onMessage=async(h,l)=>{const g=r=>{h.postMessage({...l.data,status:"success",result:r})},a=r=>{h.postMessage({...l.data,status:"failed",result:r})};if(l.data.method==="ui.showIframe"){h.show(),g(null);return}if(l.data.method==="ui.hideIframe"){h.hide(),g(null);return}if(l.data.method==="storage.set"){this.assertPermissions(h,"storage",l),localStorage.setItem(`${this.storageSpace}:${l.data.params.key}`,l.data.params.value),g(null);return}if(l.data.method==="storage.get"){this.assertPermissions(h,"storage",l);const r=localStorage.getItem(`${this.storageSpace}:${l.data.params.key}`);g(r);return}if(l.data.method==="storage.keys"){this.assertPermissions(h,"storage",l);const r=Object.keys(localStorage).filter(w=>w.startsWith(`${this.storageSpace}:`));g(r);return}if(l.data.method==="storage.remove"){this.assertPermissions(h,"storage",l),localStorage.removeItem(`${this.storageSpace}:${l.data.params.key}`),g(null);return}if(l.data.method==="panel.focus"){const r=this.activePanels[l.data.params.windowId];r&&r.focus(),g(null);return}if(l.data.method==="panel.postMessage"){const r=this.activePanels[l.data.params.windowId];r&&r.postMessage(l.data.params.data,"*"),g(null);return}if(l.data.method==="panel.close"){const r=this.activePanels[l.data.params.windowId];r&&r.close(),delete this.activePanels[l.data.params.windowId],g(null);return}if(l.data.method==="walletConnect.connect"){this.assertPermissions(h,"walletConnect",l);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");const w=await(await this.connector.walletConnect).connect(l.data.params);w.approval(),g({uri:w.uri})}catch(r){a(r)}return}if(l.data.method==="walletConnect.getProjectId"){if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");this.assertPermissions(h,"walletConnect",l);const r=await this.connector.walletConnect;g(r.core.projectId);return}if(l.data.method==="walletConnect.disconnect"){this.assertPermissions(h,"walletConnect",l);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");const w=await(await this.connector.walletConnect).disconnect(l.data.params);g(w)}catch(r){a(r)}return}if(l.data.method==="walletConnect.getSession"){this.assertPermissions(h,"walletConnect",l);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");const r=await this.connector.walletConnect,w=r.session.keys[r.session.keys.length-1],f=w?r.session.get(w):null;g(f?{topic:f.topic,namespaces:f.namespaces}:null)}catch(r){a(r)}return}if(l.data.method==="walletConnect.request"){this.assertPermissions(h,"walletConnect",l);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");const w=await(await this.connector.walletConnect).request(l.data.params);g(w)}catch(r){a(r)}return}if(l.data.method==="clipboard.writeText"){this.assertPermissions(h,"clipboardWrite",l);try{await(0,u.copyText)(l.data.params.text),g(null)}catch(r){a(r)}return}if(l.data.method==="external"){this.assertPermissions(h,"external",l);try{const{entity:r,key:w,args:f}=l.data.params,p=r.split(".").reduce((y,S)=>y[S],window);r==="nightly.near"&&w==="signTransaction"&&(f[0].encode=()=>f[0]);const m=typeof p[w]=="function"?await p[w](...f||[]):p[w];g(m)}catch(r){a(r)}return}if(l.data.method==="open"){this.assertPermissions(h,"allowsOpen",l);const r=(0,i.parseUrl)(l.data.params.url);if(r&&r.protocol==="https:"&&(0,s.isTelegramMiniApp)()){r.hostname==="t.me"?(0,s.openTelegramLink)(r):(0,s.openExternalLink)(r),g(null);return}const w=window.open(l.data.params.url,"_blank",l.data.params.features),f=w?(0,o.uuid4)():null,p=m=>{const y=(0,i.parseUrl)(l.data.params.url);y&&y.origin===m.origin&&h.postMessage(m.data)};if(g(f),window.addEventListener("message",p),w&&f){this.activePanels[f]=w;const m=setInterval(()=>{if(!w?.closed)return;window.removeEventListener("message",p);const y={method:"proxy-window:closed",windowId:f};delete this.activePanels[f],clearInterval(m);try{h.postMessage(y)}catch{}},500)}return}if(l.data.method==="open.nativeApp"){this.assertPermissions(h,"allowsOpen",l);const r=(0,i.parseUrl)(l.data.params.url);if(!r||["https","http","javascript:","file:","data:","blob:","about:"].includes(r.protocol))throw a("Invalid URL"),new Error("[open.nativeApp] Invalid URL");const f=document.createElement("iframe");f.src=l.data.params.url,f.style.display="none",document.body.appendChild(f),h.postMessage({...l.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(h,l){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let g=(0,i.parseUrl)(h.manifest.executor);if(g||(g=(0,i.parseUrl)(location.origin+h.manifest.executor)),!g)throw new Error("Invalid executor URL");g.searchParams.set("nonce",e);const a=await fetch(g.toString()).then(r=>{if(!r.ok)throw new Error(`Failed to load executor: ${r.status}`);return r.text()});return this.connector.logger?.log("New version of code fetched"),this.actualCode=a,a===l?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,a).then(()=>this.connector.logger?.log("New version of code saved to cache")).catch(r=>this.connector.logger?.log("Failed to cache new version of code",r)),a)}async loadCode(){const h=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",h!==null);const l=this.checkNewVersion(this,h);return h||await l}async call(h,l){this.connector.logger?.log("Add to queue",h,l),this.connector.logger?.log("Calling method",h,l);const g=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");const a=new t.default(this,g,this._onMessage,this.connector.cspNonce);this.connector.logger?.log("Code loaded, iframe initialized"),await a.readyPromise,this.connector.logger?.log("Iframe ready");const r=(0,o.uuid4)();return new Promise((w,f)=>{try{const p=m=>{m.data.id!==r||m.data.origin!==a.origin||(a.dispose(),window.removeEventListener("message",p),this.connector.logger?.log("postMessage",{result:m.data,request:{method:h,params:l}}),m.data.status==="failed"?f(m.data.result):w(m.data.result))};window.addEventListener("message",p),a.postMessage({method:h,params:l,id:r}),a.on("close",()=>f(new Error("Wallet closed")))}catch(p){this.connector.logger?.log("Iframe error",p),f(p)}})}async getAllStorage(){const h=Object.keys(localStorage).filter(g=>g.startsWith(`${this.storageSpace}:`)),l={};for(const g of h)l[g.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(g);return l}async clearStorage(){const h=Object.keys(localStorage).filter(l=>l.startsWith(`${this.storageSpace}:`));for(const l of h)localStorage.removeItem(l)}}return k.default=n,k}var fe;function Se(){if(fe)return v;fe=1;var c=v&&v.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(v,"__esModule",{value:!0}),v.SandboxWallet=void 0;const i=R(),o=G(),u=c(Oe());class s{connector;manifest;executor;constructor(e,n){this.connector=e,this.manifest=n,this.executor=new u.default(e,n)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){const n={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",n),await this.executor.clearStorage()}async getAccounts(e){const n={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",n)}async signAndSendTransaction(e){const n=(0,i.nearActionsToConnectorActions)(e.actions);(0,o.assertGasKeyActionsSupported)(this.manifest.features,n,this.manifest.name);const d={...e,actions:n,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",d)}async signAndSendTransactions(e){const n=e.transactions.map(h=>({actions:(0,i.nearActionsToConnectorActions)(h.actions),receiverId:h.receiverId}));(0,o.assertGasKeyActionsSupported)(this.manifest.features,n.flatMap(h=>h.actions),this.manifest.name);const d={...e,transactions:n,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",d)}async signMessage(e){const n={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",n)}async signDelegateActions(e){const n={...e,delegateActions:e.delegateActions.map(d=>({...d,actions:(0,i.nearActionsToConnectorActions)(d.actions)})),network:e.network??this.connector.network};return(0,o.assertGasKeyActionsSupported)(this.manifest.features,n.delegateActions.flatMap(d=>d.actions),this.manifest.name),this.executor.call("wallet:signDelegateActions",n)}}return v.SandboxWallet=s,v.default=s,v}var q={},ge;function Ce(){if(ge)return q;ge=1,Object.defineProperty(q,"__esModule",{value:!0}),q.InjectedWallet=void 0;const c=R(),i=G();let o=class{connector;wallet;constructor(s,t){this.connector=s,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:s,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:s})}async signInAndSignMessage(s){return this.wallet.signInAndSignMessage({network:s?.network??this.connector.network,addFunctionCallKey:s.addFunctionCallKey,messageParams:s.messageParams})}async signOut(s){await this.wallet.signOut({network:s?.network??this.connector.network})}async getAccounts(s){return this.wallet.getAccounts({network:s?.network??this.connector.network})}async signAndSendTransaction(s){const t=(0,c.nearActionsToConnectorActions)(s.actions);(0,i.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);const e=s.network??this.connector.network,n=await this.wallet.signAndSendTransaction({...s,actions:t,network:e});if(!n)throw new Error("No result from wallet");return Array.isArray(n.transactions)?n.transactions[0]:n}async signAndSendTransactions(s){const t=s.network??this.connector.network,e=s.transactions.map(d=>({actions:(0,c.nearActionsToConnectorActions)(d.actions),receiverId:d.receiverId}));(0,i.assertGasKeyActionsSupported)(this.manifest.features,e.flatMap(d=>d.actions),this.manifest.name);const n=await this.wallet.signAndSendTransactions({...s,transactions:e,network:t});if(!n)throw new Error("No result from wallet");return Array.isArray(n.transactions)?n.transactions:n}async signMessage(s){return this.wallet.signMessage({...s,network:s.network??this.connector.network})}async signDelegateActions(s){const t=s.delegateActions.map(e=>({...e,actions:(0,c.nearActionsToConnectorActions)(e.actions)}));return(0,i.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(e=>e.actions),this.manifest.name),this.wallet.signDelegateActions({...s,delegateActions:t,network:s.network??this.connector.network})}};return q.InjectedWallet=o,q}var x={},K={},we;function Te(){if(we)return K;we=1,Object.defineProperty(K,"__esModule",{value:!0}),K.NearWalletsPopup=void 0;const c=H(),i=xe(),o=Ae(),u={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}};let s=class extends o.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async n=>{n.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);const d=this.state.wallets.filter(h=>h.id!==e.dataset.type);this.update({wallets:d})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{const e=this.root.querySelector("#debug-manifest-input")?.value??"",n=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[n,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){const n=(0,c.html)`
      <svg
        class="remove-wallet-button"
        data-type="${e.id}"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="margin-right: 4px;"
      >
        <path d="M18 6L6 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M6 6L18 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;return(0,c.html)`
      <div class="connect-item" data-type="${e.id}">
        <img style="background: #333" src="${e.icon}" alt="${e.name}" />
        <div class="connect-item-info">
          <span>${e.name}</span>
          <span class="wallet-address">${(0,i.parseUrl)(e.website)?.hostname}</span>
        </div>
        ${e.debug?n:""}
      </div>
    `}get footer(){if(!this.delegate.footer)return"";const{icon:e,heading:n,link:d,linkText:h}=this.delegate.footer;return(0,c.html)`
      <div class="footer">
        ${e?(0,c.html)`<img src="${e}" alt="${n}" />`:""}
        <p>${n}</p>
        <a class="get-wallet-link" href="${d}" target="_blank">${h}</a>
      </div>
    `}get dom(){return this.state.showSettings?(0,c.html)`
        <div class="modal-container">
          <div class="modal-content">
            <div class="modal-header">
              <button class="back-button" style="left: 16px; right: unset;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <p>Settings</p>
            </div>

            <div class="modal-body">
              <p style="text-align: left;">
                You can add your wallet to dapp for debug,
                <a href="https://github.com/azbang/hot-connector" target="_blank">read the documentation.</a> Paste your manifest and click "Add".
              </p>

              <textarea style="width: 100%;" id="debug-manifest-input" rows="10">${JSON.stringify(u,null,2)}</textarea>
              <button class="add-debug-manifest-button">Add</button>
            </div>

            ${this.footer}
          </div>
        </div>
      `:(0,c.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Select wallet</p>
          <button class="settings-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="19" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="5" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
            </svg>
          </button>
        </div>

        <div class="modal-body">${this.state.wallets.map(e=>this.walletDom(e))}</div>

        ${this.footer}
      </div>
    </div>`}};return K.NearWalletsPopup=s,K}var F={},pe;function qe(){if(pe)return F;pe=1,Object.defineProperty(F,"__esModule",{value:!0});class c{dbName;storeName;version;constructor(o,u){this.dbName=o,this.storeName=u,this.version=1}getDb(){return new Promise((o,u)=>{if(typeof window>"u"||typeof indexedDB>"u"){u(new Error("IndexedDB is not available (SSR environment)"));return}const s=indexedDB.open(this.dbName,this.version);s.onerror=t=>{console.error("Error opening database:",t.target.error),u(new Error("Error opening database"))},s.onsuccess=t=>{o(s.result)},s.onupgradeneeded=t=>{const e=s.result;e.objectStoreNames.contains(this.storeName)||e.createObjectStore(this.storeName)}})}async getItem(o){const u=await this.getDb();if(typeof o=="number"&&(o=o.toString()),typeof o!="string")throw new Error("Key must be a string");return new Promise((s,t)=>{if(!this.storeName){t(new Error("Store name not set"));return}const e=u.transaction(this.storeName,"readonly");e.onerror=h=>t(e.error);const d=e.objectStore(this.storeName).get(o);d.onerror=h=>t(d.error),d.onsuccess=()=>{s(d.result),u.close()}})}async setItem(o,u){const s=await this.getDb();if(typeof o=="number"&&(o=o.toString()),typeof o!="string")throw new Error("Key must be a string");return new Promise((t,e)=>{if(!this.storeName){e(new Error("Store name not set"));return}const n=s.transaction(this.storeName,"readwrite");n.onerror=l=>e(n.error);const h=n.objectStore(this.storeName).put(u,o);h.onerror=l=>e(h.error),h.onsuccess=()=>{s.close(),t()}})}async removeItem(o){const u=await this.getDb();if(typeof o=="number"&&(o=o.toString()),typeof o!="string")throw new Error("Key must be a string");return new Promise((s,t)=>{if(!this.storeName){t(new Error("Store name not set"));return}const e=u.transaction(this.storeName,"readwrite");e.onerror=h=>t(e.error);const d=e.objectStore(this.storeName).delete(o);d.onerror=h=>t(d.error),d.onsuccess=()=>{u.close(),s()}})}async keys(){const o=await this.getDb();return new Promise((u,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}const t=o.transaction(this.storeName,"readonly");t.onerror=d=>s(t.error);const n=t.objectStore(this.storeName).getAllKeys();n.onerror=d=>s(n.error),n.onsuccess=()=>{u(n.result),o.close()}})}async count(){const o=await this.getDb();return new Promise((u,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}const t=o.transaction(this.storeName,"readonly");t.onerror=d=>s(t.error);const n=t.objectStore(this.storeName).count();n.onerror=d=>s(n.error),n.onsuccess=()=>{u(n.result),o.close()}})}async length(){return this.count()}async clear(){const o=await this.getDb();return new Promise((u,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}const t=o.transaction(this.storeName,"readwrite");t.onerror=d=>s(t.error);const n=t.objectStore(this.storeName).clear();n.onerror=d=>s(n.error),n.onsuccess=()=>{o.close(),u()}})}}return F.default=c,F}var me;function Ke(){if(me)return x;me=1;var c=x&&x.__importDefault||function(g){return g&&g.__esModule?g:{default:g}};Object.defineProperty(x,"__esModule",{value:!0}),x.NearConnector=void 0;const i=ke(),o=Te(),u=be(),s=c(qe()),t=ve(),e=Ce(),n=Se(),d=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];function h(g){return a=>Object.entries(g).length===0?!0:Object.entries(g).filter(([r,w])=>w===!0).every(([r])=>a.manifest.features?.[r]===!0)}let l=class{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;cspNonce;whenManifestLoaded;constructor(a){this.db=new s.default("hot-connector","wallets"),this.storage=a?.storage??new u.LocalStorage,this.events=a?.events??new i.EventEmitter,this.logger=a?.logger,this.cspNonce=a?.cspNonce,this.network=a?.network??"mainnet",this.walletConnect=a?.walletConnect,this.autoConnect=a?.autoConnect??!0,this.providers=a?.providers??{mainnet:[],testnet:[]},this.excludedWallets=a?.excludedWallets??[],this.features=a?.features??{},a?.footerBranding!==void 0?this.footerBranding=a?.footerBranding:this.footerBranding={icon:"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%20512%20512%22%20class%3D%22size-7%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20fill%3D%22%2300ec97%22%20rx%3D%22110%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M373.89%20106.199a31.95%2031.95%200%200%200-27.213%2015.207l-62.631%2092.979a6.67%206.67%200%200%200-.989%205.001%206.66%206.66%200%200%200%202.837%204.235%206.67%206.67%200%200%200%208.032-.494l61.643-53.47c1.02-.924%202.599-.827%203.523.193.419.473.644%201.074.644%201.697v167.402a2.49%202.49%200%200%201-2.502%202.491%202.48%202.48%200%200%201-1.912-.891L168.976%20117.497a31.93%2031.93%200%200%200-24.356-11.298h-6.508c-17.623%200-31.917%2014.294-31.917%2031.917v235.767c0%2017.623%2014.294%2031.917%2031.917%2031.917a31.94%2031.94%200%200%200%2027.213-15.206l62.631-92.98a6.66%206.66%200%200%200-1.847-9.236%206.67%206.67%200%200%200-8.033.494l-61.643%2053.471c-1.02.923-2.599.826-3.522-.194a2.5%202.5%200%200%201-.634-1.697V173.008a2.49%202.49%200%200%201%202.502-2.492c.731%200%201.439.322%201.912.891l186.313%20223.096a31.95%2031.95%200%200%200%2024.357%2011.297h6.508c17.623%200%2031.927-14.272%2031.938-31.895V138.116c0-17.623-14.294-31.917-31.917-31.917%22%2F%3E%3C%2Fsvg%3E",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async r=>{a?.manifest==null||typeof a.manifest=="string"?this.manifest=await this._loadManifest(a?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=a?.manifest??{wallets:[],version:"1.0.0"};const w=new Set(this.excludedWallets);w.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(f=>!(f.permissions.walletConnect&&!this.walletConnect||w.has(f.id))),await new Promise(f=>setTimeout(f,100)),r()}),typeof window<"u"&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async r=>{r.data.type==="near-wallet-injected"&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(w=>w.manifest.id!==r.data.manifest.id),this.wallets.unshift(new t.ParentFrameWallet(this,r.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:r.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{typeof window<"u"&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(r=>this.registerWallet(r)),this.storage.get("debug-wallets").then(r=>{JSON.parse(r??"[]").forEach(f=>this.registerDebugWallet(f))})})}get availableWallets(){return this.wallets.filter(r=>Object.entries(this.features).every(([w,f])=>!(f&&!r.manifest.features?.[w]))).filter(r=>!(this.network==="testnet"&&!r.manifest.features?.testnet))}_handleNearWalletInjected=a=>{this.wallets=this.wallets.filter(r=>r.manifest.id!==a.detail.manifest.id),this.wallets.unshift(new e.InjectedWallet(this,a.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(a){const r=a?[a]:d;for(const w of r){const f=await fetch(w).catch(()=>null);if(!(!f||!f.ok))return await f.json()}throw new Error("Failed to load manifest")}async switchNetwork(a,r){this.network!==a&&(await this.disconnect().catch(()=>{}),this.network=a,await this.connect(r))}async registerWallet(a){if(a.type!=="sandbox")throw new Error("Only sandbox wallets are supported");this.wallets.find(r=>r.manifest.id===a.id)||(this.wallets.push(new n.SandboxWallet(this,a)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(a){const r=typeof a=="string"?JSON.parse(a):a;if(r.type!=="sandbox")throw new Error("Only sandbox wallets type are supported");if(!r.id)throw new Error("Manifest must have an id");if(!r.name)throw new Error("Manifest must have a name");if(!r.icon)throw new Error("Manifest must have an icon");if(!r.website)throw new Error("Manifest must have a website");if(!r.version)throw new Error("Manifest must have a version");if(!r.executor)throw new Error("Manifest must have an executor");if(!r.features)throw new Error("Manifest must have features");if(!r.permissions)throw new Error("Manifest must have permissions");if(this.wallets.find(f=>f.manifest.id===r.id))throw new Error("Wallet already registered");r.debug=!0,this.wallets.unshift(new n.SandboxWallet(this,r)),this.events.emit("selector:walletsChanged",{});const w=this.wallets.filter(f=>f.manifest.debug).map(f=>f.manifest);return this.storage.set("debug-wallets",JSON.stringify(w)),r}async removeDebugWallet(a){this.wallets=this.wallets.filter(w=>w.manifest.id!==a);const r=this.wallets.filter(w=>w.manifest.debug).map(w=>w.manifest);this.storage.set("debug-wallets",JSON.stringify(r)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:a={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((r,w)=>{const f=new o.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(h(a)).map(p=>p.manifest),onRemoveDebugManifest:async p=>this.removeDebugWallet(p),onAddDebugManifest:async p=>this.registerDebugWallet(p),onReject:()=>(w(new Error("User rejected")),f.destroy()),onSelect:p=>(r(p),f.destroy())});f.create()})}async connect(a={}){let r=a.walletId;const w=a.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),r||(r=await this.selectWallet({features:{signInAndSignMessage:a.signMessageParams!=null?!0:void 0,signInWithFunctionCallKey:a.addFunctionCallKey!=null?!0:void 0}}));try{const f=await this.wallet(r);this.logger?.log("Wallet available to connect",f),await this.storage.set("selected-wallet",r),this.logger?.log(`Set preferred wallet, try to signIn${w!=null?" (with signed message)":""}`,r);let p;if(a.addFunctionCallKey!=null&&(this.logger?.log("Adding function call access key during sign in with params",a.addFunctionCallKey),p={...a.addFunctionCallKey,gasAllowance:a.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),w!=null){const m=await f.signInAndSignMessage({addFunctionCallKey:p,messageParams:w,network:this.network});if(!m?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",r,m),this.events.emit("wallet:signInAndSignMessage",{wallet:f,accounts:m,success:!0}),this.events.emit("wallet:signIn",{wallet:f,accounts:m.map(y=>({accountId:y.accountId,publicKey:y.publicKey})),success:!0,source:"signInAndSignMessage"})}else{const m=await f.signIn({addFunctionCallKey:p,network:this.network});if(!m?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet",r,m),this.events.emit("wallet:signIn",{wallet:f,accounts:m,success:!0,source:"signIn"})}return f}catch(f){throw this.logger?.log("Failed to connect to wallet",f),f}}async disconnect(a){a||(a=await this.wallet()),await a.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});const a=await this.storage.get("selected-wallet"),r=this.wallets.find(f=>f.manifest.id===a);if(!r)throw new Error("No wallet selected");const w=await r.getAccounts();if(!w?.length)throw new Error("No accounts found");return{wallet:r,accounts:w}}async wallet(a){if(await this.whenManifestLoaded.catch(()=>{}),!a)return this.getConnectedWallet().then(({wallet:w})=>w).catch(async()=>{throw await this.storage.remove("selected-wallet"),new Error("No accounts found")});const r=this.wallets.find(w=>w.manifest.id===a);if(!r)throw new Error("Wallet not found");return r}async use(a){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(r=>new Proxy(r,{get(w,f,p){const m=Reflect.get(w,f,p);if(f in a&&typeof m=="function"){const y=a[f];return function(...S){const J=()=>m.apply(w,S);return S.length>0?y.call(this,...S,J):y.call(this,void 0,J)}}return m}}))}on(a,r){this.events.on(a,r)}once(a,r){this.events.once(a,r)}off(a,r){this.events.off(a,r)}removeAllListeners(a){this.events.removeAllListeners(a)}};return x.NearConnector=l,x}var ye;function Le(){return ye||(ye=1,(function(c){Object.defineProperty(c,"__esModule",{value:!0}),c.assertGasKeyActionsSupported=c.isGasKeyAction=c.nearActionsToConnectorActions=c.NearConnector=c.InjectedWallet=c.SandboxWallet=c.ParentFrameWallet=c.LocalStorage=void 0;var i=be();Object.defineProperty(c,"LocalStorage",{enumerable:!0,get:function(){return i.LocalStorage}});var o=ve();Object.defineProperty(c,"ParentFrameWallet",{enumerable:!0,get:function(){return o.ParentFrameWallet}});var u=Se();Object.defineProperty(c,"SandboxWallet",{enumerable:!0,get:function(){return u.SandboxWallet}});var s=Ce();Object.defineProperty(c,"InjectedWallet",{enumerable:!0,get:function(){return s.InjectedWallet}});var t=Ke();Object.defineProperty(c,"NearConnector",{enumerable:!0,get:function(){return t.NearConnector}});var e=R();Object.defineProperty(c,"nearActionsToConnectorActions",{enumerable:!0,get:function(){return e.nearActionsToConnectorActions}});var n=G();Object.defineProperty(c,"isGasKeyAction",{enumerable:!0,get:function(){return n.isGasKeyAction}}),Object.defineProperty(c,"assertGasKeyActionsSupported",{enumerable:!0,get:function(){return n.assertGasKeyActionsSupported}})})(U)),U}var De=Le();const He=Pe({__proto__:null},[De]);export{He as i};
