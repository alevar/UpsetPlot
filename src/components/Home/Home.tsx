import React, { useState, useEffect } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import UpsetPlotWrapper from "../UpsetPlot/UpsetPlotWrapper";
import exampleCSV from "../../example/example.csv?raw";

export class UpsetMatrixData {
    private sets: Set<string> = new Set();
    private intersections: { set: string; value: number }[] = [];
    
    constructor() {
        // Initialize with empty data
    }
    
    public getSets(): string[] {
        return Array.from(this.sets);
    }
    
    public getIntersections(): { set: string; value: number }[] {
        return this.intersections;
    }
    
    public addSet(name: string): void {
        this.sets.add(name);
    }
    
    public addIntersection(set: string, value: number): void {
        this.intersections.push({ set, value });
        
        // Extract and add individual sets
        const setNames = set.split(',');
        setNames.forEach(setName => {
            this.addSet(setName);
        });
    }
    
    // Get maximum intersection value
    public getMaxIntersectionValue(): number {
        if (this.intersections.length === 0) return 0;
        return Math.max(...this.intersections.map(intersection => intersection.value));
    }
    
    // Helper method to check if a set is included in an intersection
    public isSetInIntersection(setName: string, intersection: string): boolean {
        const sets = intersection.split(',');
        return sets.includes(setName);
    }
    
    // Get subset of data based on selected sets
    public getSubset(selectedSets: string[]): UpsetMatrixData {
        const newData = new UpsetMatrixData();
        const selectedSet = new Set(selectedSets);
        
        selectedSets.forEach(s => newData.addSet(s));

        const intersectionMap = new Map<string, number>();

        this.intersections.forEach(inter => {
            const activeInInter = inter.set.split(',').filter(s => selectedSet.has(s));
            if (activeInInter.length > 0) {
                // Keep the original order of active sets or sort them?
                // For upset plots, standardizing order is typically better but original parsing relies on `headers` order or string join
                // In parseUpsetMatrixString we join by comma in the order they appeared in headers.
                // We shouldn't sort alphabetically if we want original order, but finding intersection key without knowing order could be messy.
                // We can maintain the original order they had in `inter.set.split(',')` since that comes from headers!
                const key = activeInInter.join(',');
                intersectionMap.set(key, (intersectionMap.get(key) || 0) + inter.value);
            }
        });

        intersectionMap.forEach((value, key) => {
            newData.addIntersection(key, value);
        });

        return newData;
    }
}

export interface UpsetMatrixFile {
    data: UpsetMatrixData;
    fileName: string;
    status: 1 | 0 | -1; // valid | parsing | error
}

export function parseUpsetMatrixString(result: string, fileName: string): UpsetMatrixFile {
    const upsetMatrixFile: UpsetMatrixFile = {
        data: new UpsetMatrixData(),
        fileName: fileName,
        status: 1, // Assume success until error occurs
    };
    
    const lines = result.split(/\r?\n/);
    let headers: string[] | null = null;
    let countIndex = -1;
    
    lines.forEach((line) => {
        line = line.trim();
        // Skip empty lines and comment lines
        if (!line || line.startsWith('#')) {
            return;
        }
        
        const fields = line.split(',').map(f => f.trim());
        
        if (!headers) {
            headers = fields;
            countIndex = headers.findIndex(h => h.toLowerCase() === 'count');
            if (countIndex === -1) {
                throw new Error("Header must contain a 'count' column.");
            }
            return;
        }
        
        if (fields.length !== headers.length) {
            console.warn(`Skipping malformed line: ${line}`);
            return;
        }
        
        const activeSets: string[] = [];
        let countValue: number = 0;
        
        fields.forEach((field, idx) => {
            if (idx === countIndex) {
                countValue = parseInt(field, 10);
            } else {
                if (field.toLowerCase() === 'true' || field === '1') {
                    activeSets.push(headers![idx]);
                }
            }
        });
        
        if (!isNaN(countValue) && activeSets.length > 0) {
            upsetMatrixFile.data.addIntersection(activeSets.join(','), countValue);
        } else if (isNaN(countValue)) {
            console.warn(`Invalid count value in line: ${line}`);
        }
    });
    
    return upsetMatrixFile;
}

export function parseUpsetMatrix(upsetMatrixFileName: File): Promise<UpsetMatrixFile> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const upsetMatrixFile = parseUpsetMatrixString(result, upsetMatrixFileName.name);
                resolve(upsetMatrixFile);
            } catch (error) {
                console.error("Error parsing upset matrix:", error);
                reject(new Error('Failed to parse UpsetMatrix file'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read the file'));
        };
        
        reader.readAsText(upsetMatrixFileName);
    });
}

// ── URL state encoding ────────────────────────────────────────────────────────

interface EncodedState {
    csv: string;
    fileName: string;
    selectedSets: string[];
    fontSize: number;
    width: number;
    height: number;
    sortBy: 'input' | 'count';
    hideEmpty: boolean;
}

async function encodeState(state: EncodedState): Promise<void> {
    try {
        const json = JSON.stringify(state);
        const encoded = new TextEncoder().encode(json);

        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(encoded);
        writer.close();

        const compressed = await new Response(cs.readable).arrayBuffer();
        const bytes = new Uint8Array(compressed);
        let binary = '';
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        const b64 = btoa(binary);

        // replaceState keeps a clean browser history — no new entry per keystroke
        window.history.replaceState(null, '', `#state=${encodeURIComponent(b64)}`);
    } catch (err) {
        console.error('encodeState failed:', err);
    }
}

async function decodeState(): Promise<EncodedState | null> {
    const hash = window.location.hash;
    const match = hash.match(/^#state=(.+)$/);
    if (!match) return null;

    try {
        const b64 = decodeURIComponent(match[1]);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(bytes);
        writer.close();

        const decompressed = await new Response(ds.readable).arrayBuffer();
        const json = new TextDecoder().decode(decompressed);
        return JSON.parse(json) as EncodedState;
    } catch (err) {
        console.error('decodeState failed:', err);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
    const [fullUpsetMatrixFile, setFullUpsetMatrixFile] = useState<UpsetMatrixFile>({data: new UpsetMatrixData(), fileName: "", status: 0});
    const [upsetMatrixFile, setUpsetMatrixFile] = useState<UpsetMatrixFile>({data: new UpsetMatrixData(), fileName: "", status: 0});
    const [rawCsv, setRawCsv] = useState<string>('');
    const [selectedSets, setSelectedSets] = useState<string[]>([]);
    const [fontSize, setFontSize] = useState<number>(16);
    const [width, setWidth] = useState<number>(500);
    const [height, setHeight] = useState<number>(500);
    const [sortBy, setSortBy] = useState<'input' | 'count'>('count');
    const [hideEmpty, setHideEmpty] = useState<boolean>(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copyToast, setCopyToast] = useState(false);
    // Guard: don't encode until initial state is resolved (from hash or example)
    const [stateReady, setStateReady] = useState(false);

    function loadExample() {
        try {
            const defaultData = parseUpsetMatrixString(exampleCSV, "example.csv");
            setRawCsv(exampleCSV);
            setFullUpsetMatrixFile(defaultData);
            setSelectedSets(defaultData.data.getSets());
        } catch (e) {
            console.error("Error loading default example:", e);
        }
    }

    // On mount: restore from URL hash, or fall back to example CSV
    useEffect(() => {
        (async () => {
            const saved = await decodeState();
            if (saved) {
                try {
                    const parsed = parseUpsetMatrixString(saved.csv, saved.fileName);
                    setRawCsv(saved.csv);
                    setFullUpsetMatrixFile({ ...parsed, status: 1 });
                    setSelectedSets(saved.selectedSets);
                    setFontSize(saved.fontSize);
                    setWidth(saved.width);
                    setHeight(saved.height);
                    setSortBy(saved.sortBy);
                    setHideEmpty(saved.hideEmpty);
                } catch {
                    // Corrupted / incompatible hash — fall back to example
                    loadExample();
                }
            } else {
                loadExample();
            }
            setStateReady(true);
        })();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Recompute filtered display data when full data or selected sets change
    useEffect(() => {
        if (fullUpsetMatrixFile.status === 1) {
            const displayData = fullUpsetMatrixFile.data.getSubset(selectedSets);
            setUpsetMatrixFile({
                ...fullUpsetMatrixFile,
                data: displayData
            });
        }
    }, [fullUpsetMatrixFile, selectedSets]);

    // Encode all state into the URL hash whenever anything changes (debounced 300 ms)
    useEffect(() => {
        if (!stateReady || !rawCsv) return;
        const timer = setTimeout(() => {
            encodeState({
                csv: rawCsv,
                fileName: fullUpsetMatrixFile.fileName,
                selectedSets,
                fontSize,
                width,
                height,
                sortBy,
                hideEmpty,
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [stateReady, rawCsv, fullUpsetMatrixFile.fileName, selectedSets, fontSize, width, height, sortBy, hideEmpty]);

    const handleUpsetMatrixFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const text = await file.text();
                const upsetMatrix_data = parseUpsetMatrixString(text, file.name);
                setRawCsv(text);
                setFullUpsetMatrixFile({ ...upsetMatrix_data, status: 1 });
                setSelectedSets(upsetMatrix_data.data.getSets());
            } catch (error) {
                setFullUpsetMatrixFile((prev) => ({ ...prev, status: -1 }));
                setErrorMessage("Unable to parse the file. Please make sure the file is in proper CSV format with a 'count' column and boolean values.");
                setErrorModalVisible(true);
            }
        }
    };

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
        } catch {
            // Fallback for browsers without Clipboard API
            const el = document.createElement('textarea');
            el.value = window.location.href;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                upsetMatrixStatus={fullUpsetMatrixFile.status}
                onUpsetMatrixUpload={handleUpsetMatrixFileUpload}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                hideEmpty={hideEmpty}
                onHideEmptyChange={setHideEmpty}
                availableSets={fullUpsetMatrixFile.data.getSets()}
                selectedSets={selectedSets}
                onSelectedSetsChange={setSelectedSets}
                onCopyLink={handleCopyLink}
                copyToast={copyToast}
            />

            <div className="visualization-container">
                <UpsetPlotWrapper
                    upsetMatrixFile={upsetMatrixFile}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                    sortBy={sortBy}
                    hideEmpty={hideEmpty}
                />
            </div>

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;
