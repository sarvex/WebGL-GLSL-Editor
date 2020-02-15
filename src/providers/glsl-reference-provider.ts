import { ReferenceProvider, TextDocument, Position, ReferenceContext, CancellationToken, ProviderResult, Location } from 'vscode';
import { PositionalProviderBase } from './positional-provider-base';
import { FunctionDeclaration } from '../scope/function/function-declaration';
import { FunctionCall } from '../scope/function/function-call';
import { VariableDeclaration } from '../scope/variable/variable-declaration';
import { VariableUsage } from '../scope/variable/variable-usage';
import { TypeDeclaration } from '../scope/type/type-declaration';
import { TypeUsage } from '../scope/type/type-usage';
import { LogicalFunction } from '../scope/function/logical-function';

export class GlslReferenceProvider extends PositionalProviderBase<Array<Location>> implements ReferenceProvider {

    public provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): ProviderResult<Location[]> {
        return this.processElements(document, position);
    }

    protected processFunctionPrototype(fp: FunctionDeclaration): Array<Location> {
        return this.processFunction(fp.logicalFunction);
    }

    protected processFunctionDefinition(fd: FunctionDeclaration): Array<Location> {
        return this.processFunction(fd.logicalFunction);
    }

    protected processFunctionCall(fc: FunctionCall): Array<Location> {
        return this.processFunction(fc.logicalFunction);
    }

    protected processVariableDeclaration(vd: VariableDeclaration): Array<Location> {
        return this.processDeclaration(vd);
    }

    protected processVariableUsage(vu: VariableUsage): Array<Location> {
        return this.processUsage(vu);
    }

    protected processTypeDeclaration(td: TypeDeclaration): Array<Location> {
        return this.processDeclaration(td);
    }

    protected processTypeUsage(tu: TypeUsage): Array<Location> {
        return this.processUsage(tu);
    }

    private processFunction(lf: LogicalFunction): Array<Location> {
        const ret = new Array<Location>();
        if (lf.getDeclaration().ctor) {
            return this.processConstructor(lf);
        }
        if (!lf.getDeclaration().builtIn) {
            for (const fp of lf.prototypes) {
                ret.push(this.di.intervalToLocation(fp.nameInterval));
            }
            for (const fd of lf.definitions) {
                ret.push(this.di.intervalToLocation(fd.nameInterval));
            }
        }
        for (const fc of lf.calls) {
            ret.push(this.di.intervalToLocation(fc.nameInterval));
        }
        return ret;
    }

    private processConstructor(lf: LogicalFunction): Array<Location> {
        const fd = lf.getDeclaration();
        if (fd.builtIn && !fd.returnType.array.isArray()) {
            const ret = new Array<Location>();
            for (const fc of fd.returnType.declaration.ctorCalls) {
                if (fc.logicalFunction === lf) {
                    ret.push(this.di.intervalToLocation(fc.nameInterval));
                }
            }
            return ret;
        } else {
            return this.processDeclaration(fd.returnType.declaration);
        }
    }

    private processDeclaration(element: TypeDeclaration | VariableDeclaration): Array<Location> {
        const ret = new Array<Location>();
        if (!element.builtin) {
            ret.push(this.di.intervalToLocation(element.nameInterval));
            for (const usage of element.usages) {
                ret.push(this.di.intervalToLocation(usage.nameInterval));
            }
            if (element instanceof TypeDeclaration) {
                for (const ctorCall of element.ctorCalls) {
                    ret.push(this.di.intervalToLocation(ctorCall.nameInterval));
                }
            }
        }
        return ret;
    }

    private processUsage(element: TypeUsage | VariableUsage): Array<Location> {
        const ret = new Array<Location>();
        const declaration = element.declaration;
        if (declaration && !declaration.builtin) {
            ret.push(this.di.intervalToLocation(declaration.nameInterval));
            for (const usage of declaration.usages) {
                ret.push(this.di.intervalToLocation(usage.nameInterval));
            }
            if (element instanceof TypeUsage) {
                for (const ctorCall of element.declaration.ctorCalls) {
                    ret.push(this.di.intervalToLocation(ctorCall.nameInterval));
                }
            }
        }
        return ret;
    }

}
