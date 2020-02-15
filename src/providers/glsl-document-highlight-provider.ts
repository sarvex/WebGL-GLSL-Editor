import { DocumentHighlightProvider, TextDocument, Position, CancellationToken, ProviderResult, DocumentHighlight, DocumentHighlightKind } from 'vscode';
import { LogicalFunction } from '../scope/function/logical-function';
import { Element } from '../scope/element';
import { PositionalProviderBase } from './positional-provider-base';
import { FunctionDeclaration } from '../scope/function/function-declaration';
import { FunctionCall } from '../scope/function/function-call';
import { VariableDeclaration } from '../scope/variable/variable-declaration';
import { VariableUsage } from '../scope/variable/variable-usage';
import { TypeDeclaration } from '../scope/type/type-declaration';
import { TypeUsage } from '../scope/type/type-usage';

export class GlslDocumentHighlightProvider extends PositionalProviderBase<Array<DocumentHighlight>> implements DocumentHighlightProvider {

    public provideDocumentHighlights(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<DocumentHighlight[]> {
        return this.processElements(document, position);
    }

    protected processFunctionPrototype(fp: FunctionDeclaration): Array<DocumentHighlight> {
        return this.processFunction(fp.logicalFunction);
    }

    protected processFunctionDefinition(fd: FunctionDeclaration): Array<DocumentHighlight> {
        return this.processFunction(fd.logicalFunction);
    }

    protected processFunctionCall(fc: FunctionCall): Array<DocumentHighlight> {
        return this.processFunction(fc.logicalFunction);
    }

    protected processVariableDeclaration(vd: VariableDeclaration): Array<DocumentHighlight> {
        return this.processDeclaration(vd);
    }

    protected processVariableUsage(vu: VariableUsage): Array<DocumentHighlight> {
        return this.processUsage(vu);
    }

    protected processTypeDeclaration(td: TypeDeclaration): Array<DocumentHighlight> {
        return this.processDeclaration(td);
    }

    protected processTypeUsage(tu: TypeUsage): Array<DocumentHighlight> {
        return this.processUsage(tu);
    }

    private processFunction(lf: LogicalFunction): Array<DocumentHighlight> {
        const ret = new Array<DocumentHighlight>();
        if (lf.getDeclaration().ctor) {
            return this.processConstructor(lf);
        }
        if (!lf.getDeclaration().builtIn) {
            this.addHighlight(ret, lf.prototypes, DocumentHighlightKind.Write);
            this.addHighlight(ret, lf.definitions, DocumentHighlightKind.Read);
        }
        this.addHighlight(ret, lf.calls, DocumentHighlightKind.Text);
        return ret;
    }

    private processConstructor(lf: LogicalFunction): Array<DocumentHighlight> {
        const fd = lf.getDeclaration();
        if (fd.builtIn && !fd.returnType.array.isArray()) {
            const ret = new Array<DocumentHighlight>();
            for (const fc of fd.returnType.declaration.ctorCalls) {
                if (fc.logicalFunction === lf) {
                    const range = this.di.intervalToRange(fc.nameInterval);
                    ret.push(new DocumentHighlight(range, DocumentHighlightKind.Text));
                }
            }
            return ret;
        } else {
            return this.processDeclaration(fd.returnType.declaration);
        }
    }

    private processDeclaration(element: VariableDeclaration | TypeDeclaration): Array<DocumentHighlight> {
        const ret = new Array<DocumentHighlight>();
        if (!element.builtin) {
            const range = this.di.intervalToRange(element.nameInterval);
            ret.push(new DocumentHighlight(range, DocumentHighlightKind.Read));
            this.addHighlight(ret, element.usages, DocumentHighlightKind.Text);
            if (element instanceof TypeDeclaration) {
                this.addHighlight(ret, element.ctorCalls, DocumentHighlightKind.Text);
            }
        }
        return ret;
    }

    private processUsage(element: VariableUsage | TypeUsage): Array<DocumentHighlight> {
        if (element.declaration) {
            return this.processDeclaration(element.declaration);
        } else if (element.name !== 'void') {
            const range = this.di.intervalToRange(element.nameInterval);
            return new Array<DocumentHighlight>(new DocumentHighlight(range, DocumentHighlightKind.Text));
        } else {
            return null;
        }
    }

    private addHighlight(ret: Array<DocumentHighlight>, elements: Array<Element>, dhk: DocumentHighlightKind): void {
        for (const element of elements) {
            const range = this.di.intervalToRange(element.nameInterval);
            ret.push(new DocumentHighlight(range, dhk));
        }
    }

}
