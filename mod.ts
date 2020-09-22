import { Select, SelectValueOptions } from "https://deno.land/x/cliffy@v0.14.1/prompt/select.ts";
import { Input } from "https://deno.land/x/cliffy/prompt/input.ts";
import  * as colors from 'https://deno.land/std@0.70.0/fmt/colors.ts';

interface RegistryDef {
    name: string;
    init: () => Promise<void> | void | undefined;
    getModulesPage: (page: number, pageSize: number, query?: string) => RegistryListItem[] | Promise<RegistryListItem[]>;
    showInfoPage: (module: string) => void | Promise<void> | SelectValueOptions | Promise<SelectValueOptions>;
}

interface RegistryListItem {
    name: string;
    value: string;
}

const up1Line = "\x1B[1A";
const workingMem: any = {};
const stateMachine: {[key: string]: (selectedMenu: string) => void | Promise<void>} = {
    'select_registry': async (selectedMenu: string) => {
        workingMem.registry = selectedMenu;
        workingMem.page = 1;
        workingMem.pageSize = 10;
        state = 'registry_home';
        await registries[selectedMenu].init();
    },
    'registry_home': async (selectedMenu: string) => {
        switch (selectedMenu) {
            case 'next_page_x': workingMem.page++; break;
            case 'prev_page_x': workingMem.page--; break;
            case 'back_x': state = 'select_registry'; break;
            case 'search_module_x': state = 'search_module'; break;
            default: state ='module_info'; workingMem.selectedModule = selectedMenu; break;
        }
    },
    'search_module': async (selectedMenu: string) => {
        switch (selectedMenu) {
            case 'back_x': state = 'registry_home'; break;
            default: state ='module_info'; workingMem.selectedModule = selectedMenu; break;
        }
    },
    'module_info': async (selectedMenu: string) => {
        switch (selectedMenu) {
            case 'back_x': state = 'registry_home'; break;
            default: await workingMem.moduleInfoActions[selectedMenu](); break;
        }
    }
};
let state = 'select_registry';

async function getMenu() {
    switch(state) {
        case 'select_registry':
            return {title: 'Select registry', options: Object.keys(registries).map(r => ({name: r, value: r}))};
        case 'registry_home':
            const rMenu = await registries[workingMem.registry].getModulesPage(workingMem.page, workingMem.pageSize);
            const totalPages = Math.ceil(workingMem.totalModules / workingMem.pageSize);
            return {title: workingMem.registry, options: [
                { name: "", value: "", disabled: true},
                ...rMenu,
                { name: "", value: "", disabled: true},
                Select.separator(`---- ${workingMem.page} / ${totalPages} (${workingMem.totalModules} modules)----`),
                { name: menuColor("Next page", workingMem.page === totalPages), value: "next_page_x", disabled: workingMem.page === totalPages },
                { name: menuColor("Previous page", workingMem.page === 1), value: "prev_page_x", disabled: workingMem.page === 1 },
                { name: "Search Module", value: "search_module_x"},
                { name: "Back", value: "back_x"},
            ], default: workingMem.page !== totalPages? menuColor("Next page", workingMem.page === totalPages): menuColor("Previous page", workingMem.page === 1)};
        case 'search_module':
            workingMem.query = await Input.prompt(`${'\u0008'.repeat(5)}Searching for module: `);
            workingMem.page = 1;
            const qMenu = await registries[workingMem.registry].getModulesPage(workingMem.page, workingMem.pageSize, workingMem.query);
            return {
                title: `Searching in ${workingMem.registry} for: "${workingMem.query}"`, options: [
                    { name: "", value: "", disabled: true},
                    ...qMenu,
                    { name: "", value: "", disabled: true},
                    Select.separator(`---- Searching for: "${workingMem.query}" ----`),
                    { name: "Back", value: "back_x"},
                ]
            };
        case 'module_info':
            const infoOptions = await registries[workingMem.registry].showInfoPage(workingMem.selectedModule);
            return {title: `${'\u0008'.repeat(5)}Action:`, options: [...infoOptions as any, { name: "Back", value: "back_x"}]};
    }
}
/* { name: "Next page", value: "next_page_x" },
        { name: "Previous page", value: "prev_page_x"}, */

const registries: {[key: string]: RegistryDef} = {
    "deno.land": {
        name: "deno.land/x",
        init: () => {},
        getModulesPage: async (page: number, pageSize: number, query?: string) => {
            const response = await ((await fetch(`https://api.deno.land/modules?page=${page}&limit=${pageSize}${query? `&query=${query}`: ""}`)).json());
            workingMem.totalModules = response.data.total_count;
            return (response.data.results  as any[]).map(m => ({name: `${`${colors.white(m.star_count.toString())}${colors.yellow("*")}`.padStart(26)} ${colors.green(m.name.padEnd(15))} - ${(m.description as string)?.slice(0, 50)}`, value: m.name}));
        },
        showInfoPage: async (module: string) => {
            console.log();
            // https://cdn.deno.land/pretty_benching/meta/versions.json
            // https://api.deno.land/modules/pretty_benching
            // https://cdn.deno.land/pretty_benching/versions/v0.3.0/meta/meta.json
            // https://cdn.deno.land/pretty_benching/versions/v0.3.0/raw/README.md
            const versionInfo = await ((await fetch(`https://cdn.deno.land/${module}/meta/versions.json`)).json());
            const latest = versionInfo.latest; //versionInfo.versions
            const moduleInfo = await ((await fetch(`https://cdn.deno.land/${module}/versions/${latest}/meta/meta.json`)).json());
            const uploadedAt = moduleInfo.uploaded_at;
            // directory_listing
            const apiModule = await ((await fetch(`https://api.deno.land/modules/${module}`)).json());
            const repo =  moduleInfo.upload_options.type === 'github' ? `https://github.com/${moduleInfo.upload_options.repository}`: `${moduleInfo.upload_options.type} - ${moduleInfo.upload_options.repository}`;
            const readme = (moduleInfo.directory_listing as any[]).filter(l => l.path.toLowerCase().indexOf('readme.md') !== -1);            

            console.log(`Module: ${colors.bold(colors.magenta(module))}`);
            console.log(`Stars: ${JSON.stringify(apiModule.data.star_count)}${colors.yellow('*')}`);
            console.log(`Version: [${colors.yellow(latest)}] (${uploadedAt})`);
            console.log(`Repo: ${colors.brightCyan(repo)}`);
            console.log(`Description: ${apiModule.data.description}`);
            console.log('-'.repeat(20));

            const actions: any = [];
            workingMem.moduleInfoActions = {};

            if(readme.length > 0) {
                workingMem.moduleInfoActions['readme'] = async () => {
                    const readmeText = await ((await fetch(`https://cdn.deno.land/${module}/versions/${latest}/raw${readme[0].path.replace('../', '/')}`)).text());
                    console.log();
                    console.log(readmeText);
                }
                actions.push({name: 'Show raw readme', value: 'readme'});
            }
            
            return actions;

        }
    },
    "nest.land": {
        name: "x.next.land",
        init: async () => {
            const response = await ((await fetch(`https://x.nest.land/api/packages`)).json());
            workingMem.nestModules = response;
            workingMem.totalModules = response.length;
        },
        getModulesPage: (page: number, pageSize: number, query?: string) => {
            const filteredModules = query ? (workingMem.nestModules as any[]).filter(m => (m.name as string).indexOf(query) !== -1 || m.description.indexOf(query) !== -1) : (workingMem.nestModules as any[]);
            const modulesOnPage = (filteredModules as any[]).slice((page-1) * pageSize, Math.min(filteredModules.length, page * pageSize));
            return modulesOnPage.map(m => ({name: `${colors.green(m.name.padEnd(15))} - ${(m.description as string)?.slice(0, 50)}`, value: m.name}));
        },
        showInfoPage: async (module: string) => {
            // https://x.nest.land/api/package/superoak 
            console.log();
            const moduleInfo = await ((await fetch(`https://x.nest.land/api/package/${module}`)).json());
            console.log(`Module: ${colors.bold(colors.magenta(module))}`);
            console.log(`Version: [${colors.yellow(moduleInfo.latestVersion)}] (${moduleInfo.updatedAt})`);
            console.log(`Repo: ${colors.brightCyan(moduleInfo.repository)}`);
            console.log(`Description: ${moduleInfo.description}`);
            console.log('-'.repeat(20));
            return [];
        }
    }
}

let selectedMenu;
while(selectedMenu !== 'exit') {
  selectedMenu = await showModuleMenu();
  console.log(`\r${up1Line}${up1Line}`);
  await stateMachine[state](selectedMenu);
}

async function showModuleMenu() {

    const currentMenu = await getMenu();

    return await Select.prompt({
      message: `${'\u0008'.repeat(5)}${currentMenu?.title}`,
      options: currentMenu!.options,
      keys: {
          next: ['s'],
          previous: ['w']
      },
      default: currentMenu!.default,
      maxRows: 17,
    });
  }

  function menuColor(name: string, disabled: boolean) {
    if(!disabled) {
        return colors.bold(colors.white(name));
    } else {
        return colors.gray(name);
    }
  }