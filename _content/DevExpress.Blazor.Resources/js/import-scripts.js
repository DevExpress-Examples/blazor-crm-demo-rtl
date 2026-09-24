const resourceScriptSelector = "script[type='dxbl-resource-script']";

const loadedResources = {};

async function wrapKo(callback) {
    const oldeval = window.eval;
    window.eval = (x) => {
        window.eval = oldeval;
        if(x === "this") return window;
    }
    const olddefine = window.define;
    window.define = undefined;
    await callback();
    window.define = olddefine;
}

async function importAllResources(resources) {
    for(let i = 0;i < resources.length;i++) {
        if(!loadedResources[resources[i]]) {
            loadedResources[resources[i]] = (async () => {
                try {
                    let resourcePath = resources[i][0] === "." ? "../../../" + resources[i].substring(2) : resources[i]; // take a module from root
                    if(resourcePath.indexOf("knockout") !== -1) {
                        await wrapKo(async () => await import(resourcePath));
                    } else {
                        await import(resourcePath);
                    }
                } catch(e) {
                    console.error(e);
                }
            })();
        }
        await loadedResources[resources[i]]
    }
}

async function collectAndLoadResources() {
    const resources = [...document.querySelectorAll(resourceScriptSelector)];
    if(resources.length > 0) {
        await importAllResources(resources.map(x => x.getAttribute("src")));
    }
}

new MutationObserver((mutations) => {
    for(const mutation of mutations)
        for(const node of mutation.addedNodes) {
            if(node.nodeType !== Node.ELEMENT_NODE)
                continue;
            if(node.matches(resourceScriptSelector) || node.firstElementChild && node.querySelector(resourceScriptSelector)) {
                collectAndLoadResources();
                return;
            }
        }
}).observe(document.documentElement, { childList: true, subtree: true });

const loaderPromise = collectAndLoadResources()

window["_dx_loader_promise"] = loaderPromise;

window["_dx_import_resources"] = async (params) => {
    await loaderPromise;
    await importAllResources(params);
}

export default await loaderPromise;
