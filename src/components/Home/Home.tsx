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

const Home: React.FC = () => {
    const [upsetMatrixFile, setUpsetMatrixFile] = useState<UpsetMatrixFile>({data: new UpsetMatrixData(), fileName: "", status: 0});
    const [fontSize, setFontSize] = useState<number>(16);
    const [width, setWidth] = useState<number>(500);
    const [height, setHeight] = useState<number>(500);
    const [sortBy, setSortBy] = useState<'input' | 'count'>('count');
    const [hideEmpty, setHideEmpty] = useState<boolean>(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        try {
            const defaultData = parseUpsetMatrixString(exampleCSV, "example.csv");
            setUpsetMatrixFile(defaultData);
        } catch (e) {
            console.error("Error loading default example:", e);
        }
    }, []);

    const handleUpsetMatrixFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const upsetMatrix_data: UpsetMatrixFile = await parseUpsetMatrix(file);
                setUpsetMatrixFile({ ...upsetMatrix_data, status: 1 });
            } catch (error) {
                setUpsetMatrixFile({ ...upsetMatrixFile, status: -1 });
                setErrorMessage("Unable to parse the file. Please make sure the file is in proper CSV format with a 'count' column and boolean values.");
                setErrorModalVisible(true);
            }
        }
    };

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                upsetMatrixStatus={upsetMatrixFile.status}
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
