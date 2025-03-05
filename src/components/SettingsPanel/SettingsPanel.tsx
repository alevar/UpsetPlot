import React, { useState } from "react";
import { Card, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { InfoCircle } from "react-bootstrap-icons";
import "./SettingsPanel.css";

interface SettingsPanelProps {
    upsetMatrixStatus: number;
    onUpsetMatrixUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fontSize: number;
    onFontSizeChange: (value: number) => void;
    width: number;
    onWidthChange: (value: number) => void;
    height: number;
    onHeightChange: (value: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    upsetMatrixStatus,
    onUpsetMatrixUpload,
    fontSize,
    onFontSizeChange,
    width,
    onWidthChange,
    height,
    onHeightChange,
}) => {
    // Help tooltip content for each file type
    const tooltips = {
        upset_matrix: (
            <Tooltip id="upsetMatrix-tooltip" className="tooltip-hover">
                <strong>Upset Matrix File Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                       {'SetA\t120\n'+
                        'SetB\t150\n'+
                        'SetA,SetB\t45\n'}
                </pre>
                <div>File containing the matrix to generate the upset plot.</div>
            </Tooltip>
        ),
    };

    // Helper component for upload fields with help tooltip that stays visible on hover
    const UploadFieldWithHelp = ({
        id,
        label,
        onChange,
        errorStatus,
        errorMessage,
        tooltipContent
    }: {
        id: string;
        label: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        errorStatus?: number;
        errorMessage?: string;
        tooltipContent: JSX.Element;
    }) => {
        const [show, setShow] = useState(false);

        return (
            <Form.Group controlId={id} className="mb-3">
                <OverlayTrigger
                    placement="right"
                    show={show}
                    onToggle={setShow}
                    trigger={["click"]}
                    rootClose
                    rootCloseEvent="mousedown"
                    overlay={tooltipContent}
                >
                    <span
                        className="ms-2"
                        style={{ cursor: 'help' }}
                        onClick={() => setShow(!show)} // Toggle on click too
                    >
                        <InfoCircle size={16} />
                    </span>
                </OverlayTrigger>
                <Form.Label className="d-flex align-items-center">
                    {label}
                </Form.Label>
                <Form.Control type="file" onChange={onChange} />
                {errorStatus === -1 && (
                    <div className="text-danger">{errorMessage}</div>
                )}
            </Form.Group>
        );
    };

    return (
        <div className="settings-panel">
            <Card className="settings-card">
                <Card.Body className="settings-body">
                    <Card.Title className="settings-title">Settings</Card.Title>
                    <Form>
                        <UploadFieldWithHelp
                            id="upsetMatrixUpload"
                            label="Upset Matrix"
                            onChange={onUpsetMatrixUpload}
                            errorStatus={upsetMatrixStatus}
                            errorMessage="Error parsing upset matrix file"
                            tooltipContent={tooltips.upset_matrix}
                        />

                        <Form.Group controlId="fontSize" className="mb-3">
                            <Form.Label>Font Size</Form.Label>
                            <Form.Control
                                type="number"
                                value={fontSize}
                                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="width" className="mb-3">
                            <Form.Label>Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={width}
                                onChange={(e) => onWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="height" className="mb-3">
                            <Form.Label>Height</Form.Label>
                            <Form.Control
                                type="number"
                                value={height}
                                onChange={(e) => onHeightChange(Number(e.target.value))}
                            />
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default SettingsPanel;