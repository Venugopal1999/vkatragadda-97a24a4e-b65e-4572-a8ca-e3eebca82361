"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = void 0;
const common_1 = require("@nestjs/common");
const auth_constants_1 = require("../constants/auth.constants");
const Roles = (...roles) => (0, common_1.SetMetadata)(auth_constants_1.ROLES_KEY, roles);
exports.Roles = Roles;
//# sourceMappingURL=roles.decorator.js.map