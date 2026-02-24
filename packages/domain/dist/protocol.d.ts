import { z } from 'zod';
export declare const ProtocolStatusSchema: z.ZodEnum<["draft", "published"]>;
export declare const ProtocolVersionStatusSchema: z.ZodEnum<["draft", "publishing", "published", "failed"]>;
export declare const ProtocolSeverityLevelSchema: z.ZodEnum<["low", "moderate", "high", "critical"]>;
export declare const ProtocolStepSchema: z.ZodObject<{
    order: z.ZodNumber;
    title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    instructions: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    order: number;
    title: string;
    instructions: string;
    notes?: string | undefined;
}, {
    order: number;
    title: string;
    instructions: string;
    notes?: unknown;
}>;
export declare const ProtocolEscalationSchema: z.ZodObject<{
    ifWorse: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    callSupervisor: z.ZodOptional<z.ZodBoolean>;
    referTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    ifWorse?: string | undefined;
    callSupervisor?: boolean | undefined;
    referTo?: string | undefined;
}, {
    ifWorse?: unknown;
    callSupervisor?: boolean | undefined;
    referTo?: unknown;
}>;
export declare const ProtocolSeveritySchema: z.ZodObject<{
    level: z.ZodEnum<["low", "moderate", "high", "critical"]>;
    entryCriteria: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        order: z.ZodNumber;
        title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        instructions: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        order: number;
        title: string;
        instructions: string;
        notes?: string | undefined;
    }, {
        order: number;
        title: string;
        instructions: string;
        notes?: unknown;
    }>, "many">>;
    contraindications: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    escalation: z.ZodObject<{
        ifWorse: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        callSupervisor: z.ZodOptional<z.ZodBoolean>;
        referTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        ifWorse?: string | undefined;
        callSupervisor?: boolean | undefined;
        referTo?: string | undefined;
    }, {
        ifWorse?: unknown;
        callSupervisor?: boolean | undefined;
        referTo?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    level: "low" | "high" | "moderate" | "critical";
    entryCriteria: string[];
    steps: {
        order: number;
        title: string;
        instructions: string;
        notes?: string | undefined;
    }[];
    contraindications: string[];
    escalation: {
        ifWorse?: string | undefined;
        callSupervisor?: boolean | undefined;
        referTo?: string | undefined;
    };
}, {
    level: "low" | "high" | "moderate" | "critical";
    escalation: {
        ifWorse?: unknown;
        callSupervisor?: boolean | undefined;
        referTo?: unknown;
    };
    entryCriteria?: string[] | undefined;
    steps?: {
        order: number;
        title: string;
        instructions: string;
        notes?: unknown;
    }[] | undefined;
    contraindications?: string[] | undefined;
}>;
export declare const ProtocolDosingGuidanceSchema: z.ZodObject<{
    drug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    dose: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    route: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    frequency: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    route: string;
    drug: string;
    dose: string;
    frequency: string;
    notes?: string | undefined;
}, {
    route: string;
    drug: string;
    dose: string;
    frequency: string;
    notes?: unknown;
}>;
export declare const ProtocolContentSchema: z.ZodObject<{
    protocolId: z.ZodString;
    title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    severityLevels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        level: z.ZodEnum<["low", "moderate", "high", "critical"]>;
        entryCriteria: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            order: z.ZodNumber;
            title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            instructions: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }, {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }>, "many">>;
        contraindications: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
        escalation: z.ZodObject<{
            ifWorse: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
            callSupervisor: z.ZodOptional<z.ZodBoolean>;
            referTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        }, {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        level: "low" | "high" | "moderate" | "critical";
        entryCriteria: string[];
        steps: {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }[];
        contraindications: string[];
        escalation: {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        };
    }, {
        level: "low" | "high" | "moderate" | "critical";
        escalation: {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        };
        entryCriteria?: string[] | undefined;
        steps?: {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }[] | undefined;
        contraindications?: string[] | undefined;
    }>, "many">>;
    dosingGuidance: z.ZodOptional<z.ZodArray<z.ZodObject<{
        drug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        dose: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        route: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        frequency: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: string | undefined;
    }, {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: unknown;
    }>, "many">>;
    monitoring: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    referencesSummary: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    title: string;
    protocolId: string;
    severityLevels: {
        level: "low" | "high" | "moderate" | "critical";
        entryCriteria: string[];
        steps: {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }[];
        contraindications: string[];
        escalation: {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        };
    }[];
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: string | undefined;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: string | undefined;
}, {
    title: string;
    protocolId: string;
    severityLevels?: {
        level: "low" | "high" | "moderate" | "critical";
        escalation: {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        };
        entryCriteria?: string[] | undefined;
        steps?: {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }[] | undefined;
        contraindications?: string[] | undefined;
    }[] | undefined;
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: unknown;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: unknown;
}>;
export declare const ProtocolContentPublishSchema: z.ZodEffects<z.ZodObject<{
    protocolId: z.ZodString;
    title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    severityLevels: z.ZodDefault<z.ZodArray<z.ZodObject<{
        level: z.ZodEnum<["low", "moderate", "high", "critical"]>;
        entryCriteria: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            order: z.ZodNumber;
            title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            instructions: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }, {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }>, "many">>;
        contraindications: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
        escalation: z.ZodObject<{
            ifWorse: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
            callSupervisor: z.ZodOptional<z.ZodBoolean>;
            referTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        }, {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        }>;
    }, "strip", z.ZodTypeAny, {
        level: "low" | "high" | "moderate" | "critical";
        entryCriteria: string[];
        steps: {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }[];
        contraindications: string[];
        escalation: {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        };
    }, {
        level: "low" | "high" | "moderate" | "critical";
        escalation: {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        };
        entryCriteria?: string[] | undefined;
        steps?: {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }[] | undefined;
        contraindications?: string[] | undefined;
    }>, "many">>;
    dosingGuidance: z.ZodOptional<z.ZodArray<z.ZodObject<{
        drug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        dose: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        route: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        frequency: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: string | undefined;
    }, {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: unknown;
    }>, "many">>;
    monitoring: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
    referencesSummary: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    title: string;
    protocolId: string;
    severityLevels: {
        level: "low" | "high" | "moderate" | "critical";
        entryCriteria: string[];
        steps: {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }[];
        contraindications: string[];
        escalation: {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        };
    }[];
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: string | undefined;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: string | undefined;
}, {
    title: string;
    protocolId: string;
    severityLevels?: {
        level: "low" | "high" | "moderate" | "critical";
        escalation: {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        };
        entryCriteria?: string[] | undefined;
        steps?: {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }[] | undefined;
        contraindications?: string[] | undefined;
    }[] | undefined;
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: unknown;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: unknown;
}>, {
    title: string;
    protocolId: string;
    severityLevels: {
        level: "low" | "high" | "moderate" | "critical";
        entryCriteria: string[];
        steps: {
            order: number;
            title: string;
            instructions: string;
            notes?: string | undefined;
        }[];
        contraindications: string[];
        escalation: {
            ifWorse?: string | undefined;
            callSupervisor?: boolean | undefined;
            referTo?: string | undefined;
        };
    }[];
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: string | undefined;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: string | undefined;
}, {
    title: string;
    protocolId: string;
    severityLevels?: {
        level: "low" | "high" | "moderate" | "critical";
        escalation: {
            ifWorse?: unknown;
            callSupervisor?: boolean | undefined;
            referTo?: unknown;
        };
        entryCriteria?: string[] | undefined;
        steps?: {
            order: number;
            title: string;
            instructions: string;
            notes?: unknown;
        }[] | undefined;
        contraindications?: string[] | undefined;
    }[] | undefined;
    dosingGuidance?: {
        route: string;
        drug: string;
        dose: string;
        frequency: string;
        notes?: unknown;
    }[] | undefined;
    monitoring?: string[] | undefined;
    referencesSummary?: unknown;
}>;
export declare const ProtocolCreateSchema: z.ZodObject<{
    title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    slug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    domain: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    specialty: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    title: string;
    slug: string;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    title: string;
    slug: string;
    domain?: unknown;
    specialty?: unknown;
}>;
export declare const ProtocolUpdateSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    domain: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    specialty: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    status: z.ZodOptional<z.ZodEnum<["draft", "published"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "published" | undefined;
    title?: string | undefined;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    status?: "draft" | "published" | undefined;
    title?: unknown;
    domain?: unknown;
    specialty?: unknown;
}>, {
    status?: "draft" | "published" | undefined;
    title?: string | undefined;
    domain?: string | undefined;
    specialty?: string | undefined;
}, {
    status?: "draft" | "published" | undefined;
    title?: unknown;
    domain?: unknown;
    specialty?: unknown;
}>;
export declare const ProtocolVersionCreateSchema: z.ZodObject<{
    protocolId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    protocolId: string;
}, {
    protocolId: string;
}>;
export declare const ProtocolVersionEditSchema: z.ZodObject<{
    content_json: z.ZodObject<{
        protocolId: z.ZodString;
        title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
        severityLevels: z.ZodDefault<z.ZodArray<z.ZodObject<{
            level: z.ZodEnum<["low", "moderate", "high", "critical"]>;
            entryCriteria: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
            steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
                order: z.ZodNumber;
                title: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
                instructions: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
                notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
            }, "strip", z.ZodTypeAny, {
                order: number;
                title: string;
                instructions: string;
                notes?: string | undefined;
            }, {
                order: number;
                title: string;
                instructions: string;
                notes?: unknown;
            }>, "many">>;
            contraindications: z.ZodDefault<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
            escalation: z.ZodObject<{
                ifWorse: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
                callSupervisor: z.ZodOptional<z.ZodBoolean>;
                referTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
            }, "strip", z.ZodTypeAny, {
                ifWorse?: string | undefined;
                callSupervisor?: boolean | undefined;
                referTo?: string | undefined;
            }, {
                ifWorse?: unknown;
                callSupervisor?: boolean | undefined;
                referTo?: unknown;
            }>;
        }, "strip", z.ZodTypeAny, {
            level: "low" | "high" | "moderate" | "critical";
            entryCriteria: string[];
            steps: {
                order: number;
                title: string;
                instructions: string;
                notes?: string | undefined;
            }[];
            contraindications: string[];
            escalation: {
                ifWorse?: string | undefined;
                callSupervisor?: boolean | undefined;
                referTo?: string | undefined;
            };
        }, {
            level: "low" | "high" | "moderate" | "critical";
            escalation: {
                ifWorse?: unknown;
                callSupervisor?: boolean | undefined;
                referTo?: unknown;
            };
            entryCriteria?: string[] | undefined;
            steps?: {
                order: number;
                title: string;
                instructions: string;
                notes?: unknown;
            }[] | undefined;
            contraindications?: string[] | undefined;
        }>, "many">>;
        dosingGuidance: z.ZodOptional<z.ZodArray<z.ZodObject<{
            drug: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            dose: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            route: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            frequency: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
            notes: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
        }, "strip", z.ZodTypeAny, {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: string | undefined;
        }, {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: unknown;
        }>, "many">>;
        monitoring: z.ZodOptional<z.ZodArray<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>, "many">>;
        referencesSummary: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        protocolId: string;
        severityLevels: {
            level: "low" | "high" | "moderate" | "critical";
            entryCriteria: string[];
            steps: {
                order: number;
                title: string;
                instructions: string;
                notes?: string | undefined;
            }[];
            contraindications: string[];
            escalation: {
                ifWorse?: string | undefined;
                callSupervisor?: boolean | undefined;
                referTo?: string | undefined;
            };
        }[];
        dosingGuidance?: {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: string | undefined;
        }[] | undefined;
        monitoring?: string[] | undefined;
        referencesSummary?: string | undefined;
    }, {
        title: string;
        protocolId: string;
        severityLevels?: {
            level: "low" | "high" | "moderate" | "critical";
            escalation: {
                ifWorse?: unknown;
                callSupervisor?: boolean | undefined;
                referTo?: unknown;
            };
            entryCriteria?: string[] | undefined;
            steps?: {
                order: number;
                title: string;
                instructions: string;
                notes?: unknown;
            }[] | undefined;
            contraindications?: string[] | undefined;
        }[] | undefined;
        dosingGuidance?: {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: unknown;
        }[] | undefined;
        monitoring?: string[] | undefined;
        referencesSummary?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    content_json: {
        title: string;
        protocolId: string;
        severityLevels: {
            level: "low" | "high" | "moderate" | "critical";
            entryCriteria: string[];
            steps: {
                order: number;
                title: string;
                instructions: string;
                notes?: string | undefined;
            }[];
            contraindications: string[];
            escalation: {
                ifWorse?: string | undefined;
                callSupervisor?: boolean | undefined;
                referTo?: string | undefined;
            };
        }[];
        dosingGuidance?: {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: string | undefined;
        }[] | undefined;
        monitoring?: string[] | undefined;
        referencesSummary?: string | undefined;
    };
}, {
    content_json: {
        title: string;
        protocolId: string;
        severityLevels?: {
            level: "low" | "high" | "moderate" | "critical";
            escalation: {
                ifWorse?: unknown;
                callSupervisor?: boolean | undefined;
                referTo?: unknown;
            };
            entryCriteria?: string[] | undefined;
            steps?: {
                order: number;
                title: string;
                instructions: string;
                notes?: unknown;
            }[] | undefined;
            contraindications?: string[] | undefined;
        }[] | undefined;
        dosingGuidance?: {
            route: string;
            drug: string;
            dose: string;
            frequency: string;
            notes?: unknown;
        }[] | undefined;
        monitoring?: string[] | undefined;
        referencesSummary?: unknown;
    };
}>;
export declare const ProtocolPublishRequestSchema: z.ZodObject<{
    versionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    versionId: string;
}, {
    versionId: string;
}>;
export type ProtocolStatus = z.infer<typeof ProtocolStatusSchema>;
export type ProtocolVersionStatus = z.infer<typeof ProtocolVersionStatusSchema>;
export type ProtocolSeverityLevel = z.infer<typeof ProtocolSeverityLevelSchema>;
export type ProtocolStepDto = z.infer<typeof ProtocolStepSchema>;
export type ProtocolEscalationDto = z.infer<typeof ProtocolEscalationSchema>;
export type ProtocolSeverityDto = z.infer<typeof ProtocolSeveritySchema>;
export type ProtocolDosingGuidanceDto = z.infer<typeof ProtocolDosingGuidanceSchema>;
export type ProtocolContentDto = z.infer<typeof ProtocolContentSchema>;
export type ProtocolContentPublishDto = z.infer<typeof ProtocolContentPublishSchema>;
export type ProtocolCreateDto = z.infer<typeof ProtocolCreateSchema>;
export type ProtocolUpdateDto = z.infer<typeof ProtocolUpdateSchema>;
export type ProtocolVersionCreateDto = z.infer<typeof ProtocolVersionCreateSchema>;
export type ProtocolVersionEditDto = z.infer<typeof ProtocolVersionEditSchema>;
export type ProtocolPublishRequestDto = z.infer<typeof ProtocolPublishRequestSchema>;
//# sourceMappingURL=protocol.d.ts.map