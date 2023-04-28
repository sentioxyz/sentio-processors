import { namingOverride } from "./consts.js";


function truncateTokenPrefix(str: string): string {
    if (str.startsWith('PT ') || str.startsWith('SY ') || str.startsWith('YT ')) {
        str = str.slice(3);
    }
    return str;
}

export function getNormalizedTokenName(name: string, id?: string): string {
    if (id && namingOverride[id]) {
        return namingOverride[id];
    }
    return truncateTokenPrefix(name);
}
